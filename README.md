# Loudoun Tigers website

Plain HTML/CSS/JS. No build step, no database, free to host.

## Editing (no coding needed)
| To change | Edit |
|---|---|
| League info on the home page, flyer | `data/league.json` (swap `images/home/flyer.png` for a new flyer) |
| Club name, contact email, nav, social links | `data/site.json` |
| Standings / schedule / goals / cards | `data/*.csv` (open in Excel or Google Sheets, export as CSV, keep the header row) |
| Team photos | drop files in `images/team/`, add a line in `data/team.json` |
| Venue | `data/venue.json` |
| Colors | top of `css/style.css` |

## Preview locally
`python3 -m http.server 8000` then open http://localhost:8000 (opening files directly won't load the data).

## Free hosting + your domain
Push this folder to GitHub, enable GitHub Pages (or drag the folder onto Netlify / Cloudflare Pages), then
point loudoun-tigers.com at it. Domain is the only real cost (~$12–20/yr). Cancel Weebly only after the
new site is live; if the domain is registered through Weebly, transfer it out first.
