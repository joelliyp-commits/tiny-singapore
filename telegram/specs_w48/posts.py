POSTS = [
dict(id="2026-11-23_1", slot="2026-11-23 11:00", style="chart",
 url="https://www.edgeprop.sg/property-news/developers-sales-rebound-1716-units-october-years-highest-monthly-total",
 hook="New home sales jumped from 296 to 1,716 in one month. Is the market heating up again?",
 body="""Many buyers see a jump like this and feel they must move before prices run away.

What the numbers say: developers sold 1,716 new private homes in October, up from just 296 in September and the highest monthly total this year. But it is still about 29% lower than October last year. Most of the sales came from two big launches that were priced to move.

So the signal is not a rush. Buyers are still careful, and they come in when the price makes sense. With very few launches left this year, sales will likely stay quiet until the bigger launches in the first quarter of 2027.

Use the quiet weeks to set your budget and shortlist.

If you are planning a purchase in 2027, send me your budget and current home. I will show you which launches fit your numbers."""),
dict(id="2026-11-24_1", slot="2026-11-24 11:00", style="timeline",
 url="https://sg.news.yahoo.com/executive-condo-prices-likely-remain-093450789.html",
 hook="Thinking of an EC as your next home? 2027 may be the last year to buy one on today's rules.",
 body="""Many HDB upgraders assume EC rules stay the same. They do not.

New EC sites tendered from May 2026 come with a 10 year MOP instead of 5, no deferred payment scheme, and more units set aside for first timers. Sites tendered from late August also carry a higher income ceiling of $18,000.

Huttons estimates up to about 2,017 EC units from five projects could launch in 2027, all still on the old rules. Projects on the new rules are only expected from 2028.

So a 2027 EC buyer keeps the 5 year MOP and the option to defer payment. Later buyers hold longer before selling.

Whether a 2027 EC suits you depends on your household income and your plan after MOP.

Send me your income range and current flat. I will tell you where you stand."""),
dict(id="2026-11-25_1", slot="2026-11-25 11:00", style="table",
 url="https://www.edgeprop.sg/property-news/capitaland-sing-holdings-far-east-consortium-tops-town-hall-link-white-site-tender-910-psf-ppr",
 hook="A Jurong Lake District site drew a $1.82 billion bid. What does that mean for home prices in the west?",
 body="""Many buyers in the west compare prices only with older projects nearby.

On 17 November, the Town Hall Link white site drew a top bid of about $910 psf ppr. The only other bid was about $655 psf ppr, so the top bid was about 39% higher. The site can hold up to 1,200 homes, plus offices and shops. URA has not decided whether to award it.

Land cost sets the floor for the launch price. Add building costs and margins, and new homes here will likely be priced well above today's resale in the area.

For owners nearby, this can support values over time. For buyers, it is a reference point to judge whether a current launch is fairly priced.

Send me the project you are looking at in the west. I will show you how it compares."""),
dict(id="2026-11-26_1", slot="2026-11-26 11:00", style="video",
 url="https://www.cashew.sg/interest-rates/sora",
 hook="SORA has held near 1.37% all week. Should you pick fixed or floating now?",
 body="""Many owners pick the lowest headline rate and stop there.

What the numbers say: 3 month SORA stayed at about 1.37% from 16 to 19 November, after rising slowly for months. Floating packages are priced at SORA plus a spread. The lowest 2 year fixed packages seen this week start from about 1.85%.

So the gap between fixed and floating is now small. US bond yields eased this week, which can slow the rise in SORA, but a US rate hike in December is still widely expected.

When the gap is this small, three numbers matter more than the headline rate. When your lock in ends, what your spread is, and what a 0.5% move costs you each month.

If your loan is due for repricing in the next 6 months, send me your loan amount and lock in date. I will run both options."""),
dict(id="2026-11-27_1", slot="2026-11-27 11:00", style="mythfact",
 url="https://www.srx.com.sg/research/65861/condo-rental-volumes-continue-to-decline-while-hdb-rental-prices-rise-in-october-2026",
 hook="Condo rents barely moved in October. Is buying to rent out still worth it?",
 body="""Many investors assume rents only go up, so any unit will pay for itself.

What the numbers say: condo rents rose just 0.1% in October, and about 2.5% over the past year. The number of condo leases signed fell 9.3% from September. HDB rents did a little better, up 0.5% for the month.

So rents are flat, not falling. But a flat market gives tenants more choice. The units that rent well are near transport, with practical layouts and sensible asking rents.

That means your return now depends on the unit you buy, not on the market lifting everything.

If you are thinking of buying to rent out, send me the unit or area you have in mind. I will show you the rent it can realistically fetch and what is left after costs."""),
dict(id="2026-11-28_1", slot="2026-11-28 11:00", style="carousel",
 url="https://longbridge.com/en/news/306262414",
 hook="Singapore shares fell about 5% in one week. Should home buyers worry?",
 body="""When markets drop, many buyers either freeze or start waiting for a property crash.

What happened: on Friday 20 November the STI closed at 4,975, down 2.1% that day and below 5,000 for the first time in about five months, after a global sell off in AI stocks. Money moved into bonds, and the US 10 year yield eased from 5.15% to 5.04% between 13 and 19 November.

For property, the effect is usually indirect. Some high end buyers may turn more careful. Lower bond yields can slow the rise in borrowing costs. One weak week rarely changes a home plan that runs 10 years or more.

What matters is how your down payment is held and how long you plan to stay.

Unsure whether to adjust your timing? Send me your plan. I will show you what this changes and what it does not."""),
dict(id="2026-11-29_1", slot="2026-11-29 11:00", style="checklist",
 url="https://www.99.co/singapore/insider/october-2026-developer-sales/",
 hook="Almost no new launches until the new year. How should buyers use the quiet weeks?",
 body="""Many buyers switch off in December and restart when the showflats open.

What the numbers say: after 1,716 new homes were sold in October, Huttons expects only about 200 to 300 sales in November, with just one small launch of 43 units. The bigger launches are expected from the first quarter of 2027.

Buyers who prepare now usually decide more calmly later. Three things to settle: your loan approval in principle, a shortlist based on who will buy from you later, and a side by side of resale and new launch for your budget. Resale sellers also tend to be more open to talks in quiet months.

How much room you have depends on your current home, your loan and your timeline.

Send me your budget and current home. I will help you map out the next 3 months before the launches start."""),
]

def tg(p):
    return "<b>" + p["hook"] + "</b>\n\n" + p["body"].replace("&", "&amp;")

if __name__ == "__main__":
    import re
    for p in POSTS:
        t = p["hook"] + " " + p["body"]
        print(p["id"], len(t.split()), "DASH!" if re.search(r"[‐-―-]", t) else "")
