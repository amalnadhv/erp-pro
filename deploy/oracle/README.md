# Oracle Cloud Always Free - quick notes

This is the free option that keeps `data/erp.db` on a real disk, so changes
survive restarts.

## 1. Create the VM

1. Sign in at <https://cloud.oracle.com> and pick your home region.
2. **Compute -> Instances -> Create instance**
   - Image: **Ubuntu 22.04** or **24.04**
   - Shape: **VM.Standard.A1.Flex** (Ampere, Always Free) - 1-4 OCPU / 6-24 GB
     - If you see "out of capacity", try another availability domain, or use
       **VM.Standard.E2.1.Micro** (AMD, also Always Free).
   - Add your SSH public key (or let Oracle generate a key pair and download it).
3. After it boots, note the **public IP**.

## 2. Open the ports (Oracle's cloud firewall)

**Networking -> Virtual Cloud Networks -> your VCN -> Security Lists -> Default Security List
-> Add Ingress Rules:**

| Source | Protocol | Destination Port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

SSH (22) is already open. This is a separate layer from the OS firewall that
the script below handles - **both** must allow the traffic.

## 3. Run the installer

SSH in, clone the repo, then run the script:

```bash
ssh ubuntu@<public-ip>
git clone https://github.com/amalnadhv/erp-pro.git
cd erp-pro
sudo bash deploy/oracle/install.sh
```

With a domain (HTTPS automatic):

```bash
sudo env DOMAIN=erp.example.com bash deploy/oracle/install.sh
```

Without owning a domain, use a free `nip.io` hostname that points at your IP:

```bash
sudo env DOMAIN=203-0-113-10.nip.io bash deploy/oracle/install.sh
```

The script installs Node 24, builds the app, creates the `erp` systemd service,
opens 80/443 in the OS firewall, installs Caddy, and configures the reverse
proxy. It is safe to re-run after a `git pull`.

## 4. Verify

```bash
curl http://127.0.0.1:4173/api/health
systemctl status erp --no-pager
journalctl -u erp -n 50 --no-pager
```

Then open the printed URL.

## Accounts

- **Create your own workspace** with the Sign Up form. Each signup creates a
  separate tenant, so accounts and data are isolated.
- `admin@local.test` / `admin123` is a shared demo tenant. Treat it as a
  sandbox; do not store real data there.

## Copying your existing data

From your Windows machine (replace the IP):

```powershell
scp -r data ubuntu@<public-ip>:/home/ubuntu/erp-pro/
```

Then `sudo systemctl restart erp`.

## Updating the app later

```bash
cd ~/erp-pro
git pull
npm ci
npm run build
sudo systemctl restart erp
```

`data/` is untouched by updates.

## Limits / gotchas

- Always Free Ampere capacity is often unavailable in popular regions; retry
  later or use the AMD micro shape (1 GB RAM is tight but workable for a demo).
- Oracle may reclaim idle Always Free resources - keep the instance active.
- Back up `data/erp.db` and `data/storage/` regularly.
- Vercel's free tier is ephemeral: its database and signups reset on cold
  starts. Use this VM (or another host with a real disk) for lasting data.
