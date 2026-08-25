# PakBattle Esports — Vanilla HTML/CSS/JS + Supabase

Yeh original React project ka pura HTML/CSS/JS version hai. Backend wahi Supabase
project hai jo pehle se aapki zip file ke `.env` mein tha, isliye tournaments,
players, payments — sab wahi purana data yahan bhi dikhega. Koi build step,
Node.js, ya bundler nahi chahiye — seedha browser mein khulti hai.

## Kaise chalayen

Sirf `index.html` ko double-click karke browser mein khol sakte hain, magar
behtar hai ke ek chhota local server se serve karein (kyun ke Supabase auth
redirects aur ES module imports file:// URLs par kabhi kabhi block ho jate hain):

```bash
# is folder ke andar
python3 -m http.server 8080
# phir browser mein: http://localhost:8080
```

Ya VS Code ka "Live Server" extension bhi chalega.

## Hosting (production)

Yeh static files hain — kisi bhi static host par daal sakte hain:
- Netlify / Vercel (drag & drop is folder ko)
- GitHub Pages
- Apna cPanel / shared hosting (`public_html` mein saari files copy kar dein)

## Structure

```
index.html            Home
tournaments.html       Sab tournaments (filter + search)
tournament.html         Tournament detail (?id=...)
join.html                Payment submit / join tournament (?id=...)
leaderboard.html        Players ranking
live.html                YouTube live status
contact.html             Contact + reviews
auth.html                Login / Sign up
dashboard.html           User ka apna dashboard
admin.html                Admin panel (sirf admin role walon ke liye)

css/style.css            Poora theme (black/gold PUBG esports look)
js/supabase-client.js    Supabase connection (URL + anon key)
js/layout.js              Header/Footer, login state, live dot
js/format.js               Currency/date helpers
js/tournament-card.js      Tournament card banane wala reusable code
js/*.js                     Har page ka apna logic
assets/                    Logo + hero image
```

## Admin Panel — Owner koi bhi cheez bina code ke edit kar sakta hai

`admin.html` par jaayen (login hone ke baad, agar aapka account **admin** role
rakhta ho). Wahan se:

- **Tournaments** — naya tournament banayen, edit/delete karein
- **Payments** — EasyPaisa/JazzCash payment screenshots dekhein, approve/reject
  karein
- **Room IDs** — har tournament ka Room ID/Password set karein (players ko sirf
  approve hone ke baad dikhta hai)
- **Results** — winners/positions/kills/prize add karein (player stats khud-b-khud
  update ho jate hain)
- **Players** — players search karein, kisi ko admin bana sakte hain
- **Settings** — payment account numbers, live stream YouTube video ID,
  contact info (WhatsApp/email/socials), aur homepage stats — sab yahan se
  edit hote hain, koi code chhoone ki zaroorat nahi

### Apna account admin banane ke liye (pehli martaba)

Naye accounts default `player` role ke sath bante hain. Khud ko admin banane
ke liye Supabase dashboard mein jaakar (Table Editor → `user_roles`) apni
`user_id` ke sath ek row add karein: `role = admin`. Uske baad aap doosre
players ko bhi Admin Panel ke "Players" tab se admin bana sakte hain.

## Database / Backend

Koi naya backend setup nahi karna — yeh usi Supabase project se connected
hai jo original app use kar raha tha (`js/supabase-client.js` mein URL aur
anon key maujood hain). Tables: `tournaments`, `registrations`, `payments`,
`results`, `profiles`, `user_roles`, `notifications`, `reviews`,
`site_settings`. Row Level Security pehle se laga hua hai — sirf verified
admins hi sensitive edits kar sakte hain.

## Note

- Live stream YouTube API key wali cheez hata di gayi hai (woh original app
  mein ek extra API key manga karta tha) — iski jagah Admin → Settings → Live
  Stream mein aap khud "Live hai ya nahi" aur video ID set kar sakte hain,
  jo zyada simple aur reliable hai.
