# Arsitektur Infrastruktur

Akses publik memakai **Cloudflare Tunnel**. ALB/ACM dan cert-manager tidak
dipakai. Appserver tetap di private subnet tanpa public IP.

---

## 1. Skema yang dipakai: Cloudflare Tunnel

`cloudflared` berjalan sebagai pod di k3s. Dialah yang membuka koneksi keluar
ke Cloudflare, jadi tidak ada port inbound yang harus dibuka di appserver.

```mermaid
flowchart TB
    USER[Browser https://tokenaiku.com] --> CF[Cloudflare edge<br/>CNAME -> .cfargotunnel.com]
    CF -->|tunnel QUIC/HTTPS, outbound| CD[cloudflared pod<br/>namespace cloudflare-tunnel]
    CD -->|https://traefik.kube-system.svc:443<br/>No TLS Verify| TR[Traefik Ingress]

    subgraph PRIV[Private subnet 10.30.10.0/24 - appserver k3s]
        TR -->|/| FE[frontend-service:80<br/>nginx static]
        TR -->|/api| API[apiservice-service:4000]
        TR -->|/v1| GW[gatewayservice-service:5000]
        API --- PG[(Postgres)]
        API --- JWT[JWT_SECRET]
        GW --- REDIS[(Redis)]
        GW -.->|log dibuang| MQ[RabbitMQ / worker<br/>replicas = 0]
    end

    APP[appserver 10.30.10.234] --- TR
    APP -->|outbound internet 0.0.0.0/0| NAT[NAT instance 10.30.1.151]
    NAT --> IGW[Internet Gateway]
```

### Kenapa cocok

| Aspek | Keterangan |
|---|---|
| Public IP appserver | Tidak perlu |
| Port inbound 80/443 | Tidak perlu |
| TLS browser | Dipegang Cloudflare (sertifikat valid) |
| TLS origin | Self-signed Traefik, verifikasi dimatikan di tunnel |
| DNS | CNAME otomatis ke `<tunnel-id>.cfargotunnel.com` |
| Biaya tunnel | Gratis |

### Ingress tetap dipakai

| Ingress | Entry point | Path | Backend |
|---|---|---|---|
| `http-redirect-ingress` | `web` (:80) | `/` | 301 → HTTPS (internal) |
| `frontendservice-ingress` | `websecure` (:443) | `/` | `frontend-service:80` |
| `apiservice-ingress` | `websecure` (:443) | `/api` | `apiservice-service:4000` |
| `gatewayservice-ingress` | `websecure` (:443) | `/v1` | `gatewayservice-service:5000` |

### Manifest terkait

- `kubernetes/cloudflare-tunnel/namespace.yaml`
- `kubernetes/cloudflare-tunnel/deployment.yaml`
- `kubernetes/cloudflare-tunnel/README.md` — langkah lengkap (token, route, verifikasi)

---

## 2. Jalur lama (NAT + DNAT, sekarang opsional)

Ini yang dipakai sebelum tunnel. Masih aktif di AWS, tapi tidak lagi menjadi
jalur utama.

```mermaid
flowchart LR
    U[Browser] --> EIP[EIP 15.232.223.13]
    EIP --> NAT[NAT instance + iptables DNAT]
    NAT -->|80/443| APP[appserver 10.30.10.234]
    APP --> TR[Traefik Ingress]
    TR --> FE[frontend]
    TR --> API[api-service]
    TR --> GW[gateway-service]
    APP --> NAT
    NAT --> IGW[Internet Gateway]
```

Routing AWS:

| Route table | Subnet | Default route |
|---|---|---|
| `rtb-0ac3992a5e226acd0` | public `10.30.1.0/24` | `0.0.0.0/0` → Internet Gateway |
| `rtb-005a29ba517a55d30` | private `10.30.10.0/24` | `0.0.0.0/0` → NAT instance |

Security group:

| SG | Inbound |
|---|---|
| NAT `sg-07cb13f76a947e667` | 80, 443 dari `0.0.0.0/0`; all dari `10.30.10.0/24` |
| App `sg-0489d4203a1742f30` | 80, 443 dari SG NAT |

Kalau tunnel sudah terbukti stabil, DNAT dan rule inbound SG di atas bisa
dicabut supaya EIP tidak lagi menerima traffic publik. NAT instance tetap
diperlukan untuk **outbound** internet dari private subnet.

---

## 3. Catatan penting

- `apiservice-secret` berisi `JWT_SECRET`, `POSTGRES_USER`,
  `POSTGRES_PASSWORD`, `POSTGRES_DB`, `tls.crt`, dan `tls.key`.
  Jangan ditimpa oleh tool sertifikat lain.
- RabbitMQ dan worker sengaja `replicas: 0` supaya t3.small (2GB) cukup.
- Token Cloudflare disimpan sebagai Kubernetes Secret, **jangan** dimasukkan
  ke Git.
- Jika tunnel putus, cek:
  ```bash
  kubectl-ms -n cloudflare-tunnel logs deploy/cloudflared --tail=50
  kubectl-ms -n cloudflare-tunnel get pods
  ```
