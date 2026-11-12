# Save With Property: Telegram visual styles and rotation

Render with `python3 telegram/make_visual.py spec.json telegram/cards/<id>` (usage notes and spec fields at the top of make_visual.py). Specs for each style are in `telegram/samples/` as reference images. Always Read every rendered PNG (and a few frames of any MP4) and fix overflow, overlaps or awkward wrapping before queueing. All visuals are 1080x1080, same navy and gold brand, Montserrat.

## The styles and when each fits
| Style | Best for | Avoid when |
| --- | --- | --- |
| card | One or two headline numbers | Already used in either of the last 3 posts |
| chart | A trend over time or a comparison of 3+ values (prices, SORA, transactions) | Fewer than 3 data points |
| table | Side by side facts: quarter at a glance, fixed vs floating, new vs resale | More than 5 rows or 3 columns |
| checklist | Tips with 3 or 4 action points | News without clear actions |
| mythfact | Correcting a common belief (records, waiting for rates, freehold vs leasehold) | Pure data news |
| timeline | Policy dates, launch to TOP to MOP cycles, step by step processes | Single event news |
| map | Location matters: region comparison, MRT line, new estate. Schematic only, labelled not to scale | Exact geography is needed |
| carousel | Tips that need a story: hook, example, checklist, bridge to Joel (3 to 5 slides) | Short news |
| video | Any chart, card or timeline post animated (about 8 to 12 s, silent) | More than 2 per week |

## Rotation rules
1. Pick the style that genuinely fits the content first (table above).
2. Among the fitting styles, choose the one used least recently, by reading the `style` column (H) of the queue sheet.
3. Never use the same style for two posts in a row, and never more than twice in any 6 consecutive posts.
4. Aim for at least 5 different styles across each week; at least 1 carousel and at most 2 videos per week.
5. Record the style used in column H of the queue row.

## Media column (C) format for the poster
- Single image: the raw GitHub URL of the PNG.
- Video: the raw GitHub URL of the MP4 (keep under 15 MB).
- Carousel: the raw GitHub URLs of each slide PNG, one per line, in order. The post text becomes the caption of the first slide.

## YouTube videos
The Apps Script runs once a week (Sunday about 8pm SGT). It queues, all as approved rows:
- New full videos (id yt_<videoId>, style "youtube"): take the next free slot ahead of everything else.
- One of the 3 most recent full videos per week until all 3 are re-shared (id ytold_<videoId>), normal queue order.
- 3 Shorts from one series (id ytshort_<videoId>, style "youtube_short"). Series = Joel's YouTube playlists; the series rotates weekly (least recently used first) and no Short is ever posted twice. Shorts post only at 3pm on Monday, Wednesday and Friday.
So on Monday, Wednesday and Friday the daily pack makes only 1 news post (the 11am slot). Tip days (Tue, Thu, Sat) are unchanged.
