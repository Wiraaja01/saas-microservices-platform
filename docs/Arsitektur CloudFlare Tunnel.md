# Cloudflare Tunnel (tanpa port inbound, tanpa ALB)

Skema ini menggantikan DNAT di NAT instance. `cloudflared` jalan sebagai pod
di dalam k3s dan membuka koneksi **keluar** ke Cloudflare. Karena koneksinya
outbound, appserver boleh tetap di private subnet tanpa public IP.

```text
browser -> https://tokenaiku.com -> Cloudflare edge
        -> tunnel (QUIC/HTTPS keluar) -> cloudflared pod
        -> https://traefik.kube-system.svc:443 (no TLS verify)
        -> Ingress /, /api, /v1 -> Service -> pod
```

## 1. Buat tunnel di Cloudflare

1. Pastikan `tokenaiku.com` sudah ada di akun Cloudflare dan nameserver-nya
   mengarah ke Cloudflare.
2. Buka **Zero Trust → Networks → Tunnels → Create a tunnel**.
3. Nama bebas, misalnya `k3s-tokenaiku`.
4. Pilih **Docker**, lalu **salin token** (bentuk `eyJhIjoi...`).
   Jangan jalankan perintah Docker yang diberikan; kita pakai Kubernetes.

## 2. Simpan token sebagai Secret

**Jangan commit token ke Git.** Buat langsung di cluster:

```bash
kubectl-ms -n cloudflare-tunnel create secret generic cloudflare-tunnel-token \
  --from-literal=token='PASTE_TOKEN_DISINI'
```

## 3. Apply manifest

```bash
kubectl-ms apply -f kubernetes/cloudflare-tunnel/
kubectl-ms -n cloudflare-tunnel get pods
kubectl-ms -n cloudflare-tunnel logs deploy/cloudflared --tail=30
```

Pod harus `1/1 Running`, dan log menampilkan
`INF Starting tunnel tunnelID=...` lalu `Connection registered`.

## 4. Tambah route di dashboard

Di tunnel yang sudah dibuat, buka tab **Routes / Public Hostname**:

| Field | Nilai |
|---|---|
| Hostname | `tokenaiku.com` |
| Service Type | `HTTPS` |
| URL | `traefik.kube-system.svc.cluster.local:443` |
| Additional settings → TLS → **No TLS Verify** | **ON** |

Lakukan juga untuk `www.tokenaiku.com` kalau mau.

Kenapa `No TLS Verify`: sertifikat Traefik masih self-signed. Koneksi tetap
terenkripsi di dalam tunnel; yang dinonaktifkan hanya verifikasi sertifikat
origin antara cloudflared dan Traefik.

Cloudflare akan otomatis membuat DNS record:

```text
CNAME  tokenaiku.com  -> <tunnel-id>.cfargotunnel.com
```

## 5. Pengaturan SSL Cloudflare

Di **SSL/TLS → Overview**, pakai mode **Full**. Jangan pakai *Full (strict)*
karena origin masih memakai sertifikat self-signed.

## 6. Verifikasi

```bash
curl -I https://tokenaiku.com/
curl -s https://tokenaiku.com/ | head -5
curl -s -X POST https://tokenaiku.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"PASSWORD_KAMU"}'
```

## Catatan

- Ingress (`/`, `/api`, `/v1`) tetap dipakai sebagai origin di belakang tunnel.
- Ingress `http-redirect-ingress` (port 80) tidak dipakai tunnel, tapi boleh
  dibiarkan untuk akses internal.
- DNAT 80/443 dan inbound SG di NAT/EIP sekarang **tidak diperlukan**. Kalau
  mau lebih aman, saya bisa cabut keduanya setelah tunnel terbukti jalan.
- Token harus disimpan sebagai Secret; kalau ganti token, cukup:
  ```bash
  kubectl-ms -n cloudflare-tunnel delete secret cloudflare-tunnel-token
  # lalu buat ulang seperti langkah 2, rollout restart deploy/cloudflared
  ```
