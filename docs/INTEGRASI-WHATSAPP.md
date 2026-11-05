# 💬 INTEGRASI WHATSAPP (OPSIONAL) — MADANI HEALTHCARE

Sistem sudah punya **notifikasi in-app** (bel di pojok kanan atas) yang terkirim
otomatis saat: tindak lanjut kesehatan baru dibuat, dan pengingat MCU dijalankan.

Jika ingin pengingat juga masuk **WhatsApp** pegawai, ikuti arsitektur aman berikut.

---

## Prinsip Keamanan (WAJIB)

```
[Supabase Edge Function]  →  [API WhatsApp Provider]  →  [WA Pegawai]
        ↑ token disimpan di SECRETS (server) — BUKAN di frontend/GitHub
```

- **JANGAN** menaruh token/secret WhatsApp di `js/config.js` atau repo GitHub.
- Kredensial hanya di **Supabase Edge Function secrets**.
- Pesan WA hanya **pengingat umum** (mis. "MCU Anda tanggal X") — **tidak pernah**
  berisi hasil lab/diagnosis (kerahasiaan medis + UU No. 27/2022).

## Pilihan Penyedia

| Penyedia | Jenis | Biaya | Kebutuhan |
|---|---|---|---|
| **Meta WhatsApp Cloud API** | Resmi | Gratis kuota awal | Akun Meta Business, nomor WA, template disetujui |
| **Twilio WhatsApp** | Resmi | Berbayar | Account SID + Auth Token + nomor terverifikasi |
| **Fonnte / Wablas** | Gateway lokal | Murah/gratis | Device/token, cepat diaktifkan |

## Contoh: Fonnte (paling cepat untuk sekolah)

### 1. Dapatkan token
Daftar https://fonnte.com → hubungkan nomor WhatsApp → salin **token device**.

### 2. Buat Edge Function

```bash
# dari komputer Anda (butuh Node.js + Supabase CLI)
npx supabase login
npx supabase functions new wa-notify
```

Isi `supabase/functions/wa-notify/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!   // hanya di server
  );

  // pegawai + no HP yang punya MCU terjadwal 7 hari ke depan
  const { data: targets } = await sb.rpc('rpc_mcu_reminder_targets', { p_days: 7 });

  let sent = 0;
  for (const t of targets ?? []) {
    if (!t.phone) continue;
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: Deno.env.get('WA_TOKEN')! },
      body: new URLSearchParams({
        target: t.phone.replace(/^0/, '62'),           // format 62xxx
        message: `Assalamu'alaikum ${t.nama}, pengingat: Medical Check Up Anda ` +
                 `dijadwalkan ${t.tanggal}. Mohon hadir tepat waktu. ` +
                 `— MADANI HEALTHCARE, YPPIM Nurul Fikri Lembang`
      })
    });
    sent++;
  }
  return new Response(JSON.stringify({ sent }));
});
```

Tambahkan helper di Supabase (**SQL Editor**) supaya function punya daftar target:

```sql
create or replace function public.rpc_mcu_reminder_targets(p_days int)
returns table (nama text, phone text, tanggal date)
language sql security definer set search_path = public as $$
  select e.full_name, e.phone, mc.checkup_date
  from medical_checkups mc
  join employees e on e.id = mc.employee_id
  where mc.status = 'terjadwal'
    and mc.checkup_date between current_date and current_date + p_days;
$$;

grant execute on function public.rpc_mcu_reminder_targets(int) to service_role;
```

### 3. Simpan token sebagai secret & deploy

```bash
npx supabase secrets set WA_TOKEN=TOKEN_FONNTE_ANDA
npx supabase functions deploy wa-notify
```

### 4. Jadwalkan harian (opsional)

Dengan **pg_cron + pg_net** (Database → Extensions):

```sql
select cron.schedule('wa-pengingat-harian', '0 7 * * *', $$
  select net.http_post(
    url    := 'https://<PROJECT-REF>.supabase.co/functions/v1/wa-notify',
    headers:= '{"Authorization":"Bearer <ANON-KEY>"}'::jsonb
  )$$);
```

## Contoh: Meta WhatsApp Cloud API (resmi, skala besar)

Ubah bagian kirim pesan pada Edge Function menjadi:

```typescript
await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${Deno.env.get('META_TOKEN')!}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    to: '62812xxxxxxx',
    type: 'template',
    template: {
      name: 'pengingat_mcu',          // template harus disetujui Meta
      language: { code: 'id' },
      components: [{ type: 'body', parameters: [
        { type: 'text', text: t.nama }, { type: 'text', text: t.tanggal }
      ]}]
    }
  })
});
```

Secrets: `npx supabase secrets set META_TOKEN=... PHONE_NUMBER_ID=...`

## Ringkasan

| Item | Lokasi |
|---|---|
| Token WhatsApp | Supabase Edge Function secrets (server) |
| Logika pengiriman | `supabase/functions/wa-notify` |
| Pemicu | pg_cron harian / manual via Pengaturan |
| Isi pesan | Pengingat umum saja — tanpa data medis |
