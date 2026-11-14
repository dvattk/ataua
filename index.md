<!--
Editable text copy of index.html. Edit the words freely; I'll port the changes back.
- Lines like [figure: ...] / [chart: ...] mark visuals: leave them in place (edit the description if you want the alt text changed).
- Math is LaTeX: $...$ inline, $$...$$ display.
- "▸ Collapsible:" blocks are the expandable <details> sections.
-->

# AτA
## A Benchmark for Multi‑Agent Interaction in Agentic Economies

<!-- page meta description -->
> When travelers and airlines both send AI agents to the market, bookings get made, but the market they build together is far from the best one available.

**Authors:** Dheeraj Vattikonda^1,7^, Michael Noukhovitch^2,7^, Haolun Wu^7,8^, Quan Shi^3^, Aaron Courville^2,7^, Christopher Pal^1,7^, Siva Reddy^4,7,8^, Victor Barres^5^, Laurent Charlin^6,7^, Emiliano Penaloza^2,7^

**Affiliations:** ^1^Polytechnique Montréal · ^2^Université de Montréal · ^3^Sierra · ^4^ServiceNow Inc · ^5^Mercor · ^6^HEC Montréal · ^7^Mila · ^8^McGill University

[logos: Sierra, Mercor, Mila]

[figure: Animated diagram: users delegate to user agents, airlines to provider agents; user agents send requests and provider agents respond; more users join; then user agents coordinate privately.]

---

## Overview

We introduce **AτA**, a scalable simulator for studying agentic markets.

Current benchmarks assume that agents work in isolated workspaces, interacting with platforms through custom tools ([Yao et al., 2024](https://arxiv.org/abs/2406.12045); [Barres et al., 2025](https://arxiv.org/abs/2506.07982); [Shi et al., 2026](https://arxiv.org/abs/2603.04370); [Xie et al., 2024](https://arxiv.org/abs/2402.01622)). We believe instead that the web will become more agentic, with multiple agents interacting on behalf of their respective parties, each optimizing a different utility.

**AτA** is built to simulate these dynamics where multiple user agents interact asynchronously with multiple provider agents, each optimizing their owner's utility function. We study how well agents achieve their respective objectives under abundance and scarcity and under cost asymmetry between providers and users, as well as how different communication channels affect market dynamics.

▸ Collapsible: **Cite this work**

```bibtex
@inproceedings{ataua2027,
  title     = {A$\tau$A: A Benchmark for Multi-Agent Interaction in Agentic Economies},
  author    = {Vattikonda, Dheeraj and Noukhovitch, Michael and Wu, Haolun and Shi, Quan and Courville, Aaron and Pal, Christopher and Reddy, Siva and Barres, Victor and Charlin, Laurent and Penaloza, Emiliano},
  booktitle = {Under review},
  year      = {2027}
}
```

---

## Simulator Design

We focus on the airline domain for our simulator, as it provides real historical fare and flight-route data to ground task generation. This data comes from the Airline Origin and Destination Survey (DB1B) of the U.S. Bureau of Transportation Statistics ([BTS, 2025](https://www.transtats.bts.gov/DatabaseInfo.asp?QO_VQ=EFI)). Using these routes as targets, we synthetically inject personas, preferences and budgets for each user to build personalized tasks.

Each task in the simulator is therefore made up of multiple user agents interacting with multiple provider agents, each trying to optimize the utility of the party it represents.

### Provider Agent

Each airline provider maintains a flight database listing the routes it serves, departure and arrival times, fares, and the number of seats available in each cabin class. This inventory determines which flights a provider can offer and how many travelers it can serve. For our experiments, we generate flight schedules over a 30-day period <!-- TODO @dheeraj: which 30-day period? -->. The resulting catalog contains 1,746 itineraries across 44 airports and 23 airlines, and it can be expanded by using the full historical data.

[figure: inventory animation]

### User Agent

We create users with diverse personas, preferences and budgets. To simulate realistic spending, we give each user a **target budget**, the amount they would prefer to spend, and a **walk-away budget**, the limit on their credit card.

In practice, users rarely state all of their preferences in each request. To test whether agents can extract preferences from user data, we give each user synthetic emails that mention their preferences naturally. For each user we generate between 20 and 30 emails (sampled uniformly), and only 25% of them contain the user's real preferences, while the rest contain noisy preferences.

[figure: users animation]

A task brings together $\boldsymbol{N}$ users who interact with $\boldsymbol{P}$ providers at the same time.

▸ Collapsible: **How large is the task space?**

> The inventory has 1,746 flights, each bookable on 14 dates, giving $F = 1{,}746 \times 14 = 24{,}444$ flight–date options. Each user's booking is described by eight attributes:
>
> | Attribute | Values | Count |
> |---|---|---|
> | Cabin class | basic economy, economy, business | 3 |
> | Passengers | 1, 2, 3 | 3 |
> | Checked bags per passenger | 0, 1, 2, 3, 4 | 5 |
> | Insurance | yes, no | 2 |
> | Seat preference | aisle, window, none | 3 |
> | Flight type | one-way, round-trip | 2 |
> | Payment style | single card, single certificate, mixed | 3 |
> | Membership tier | regular, silver, gold | 3 |
>
> $$G = 3 \times 3 \times 5 \times 2 \times 3 \times 2 \times 3 \times 3 = 4{,}860$$
>
> $$N_{\text{goal}} = F \times G = 24{,}444 \times 4{,}860 \approx 118.8 \text{ million}$$
>
> A task puts $m$ users on the same reference flight, so the space grows as $F \times G^{m}$. For a pool of 20 users that is about $10^{78}$ combinations. We evaluate a fixed sample of 100 tasks.

### Supply conditions

In real life, flights can only take a limited number of travelers. To account for this, we provide two settings in our simulator. In **abundant** mode, we assume there is no cap on passengers per flight. In **scarce** mode, we sample the number of available seats on each flight from a Poisson distribution (details below).

▸ Collapsible: **Scarcity**

> For each task, we take every date within seven days of any user's departure or return date. On these dates, each flight and cabin gets a new number of seats, drawn from a Poisson distribution and capped at its original number of seats. The mean of the Poisson distribution depends on the cabin: 0.3 for basic economy, 0.6 for economy and 1.5 for business. All users of the task then book from this reduced inventory.
>
> **Algorithm 1** Scarce inventory for one task
>
> **Input:** seats $s_{f,d,c}$ for flight $f$, date $d$, cabin $c$; the task's users $U$; base mean $\mu = 1$; cabin multipliers $b_c$
> **Output:** reduced seats $s'_{f,d,c}$
>
> 1. $W \leftarrow \{\, d + k \;:\; d$ a departure or return date of some $u \in U,\; k = -7,\dots,7 \,\}$
> 2. **for** each flight $f$, date $d \in W$, cabin $c$ **with** $s_{f,d,c} > 0$ **do**
> 3. &nbsp;&nbsp;&nbsp;&nbsp;$X \sim \mathrm{Poisson}(\mu\, b_c)$
> 4. &nbsp;&nbsp;&nbsp;&nbsp;$s'_{f,d,c} \leftarrow \min(s_{f,d,c},\, X)$
> 5. **end for**
> 6. dates outside $W$ keep their seats: $s'_{f,d,c} \leftarrow s_{f,d,c}$
> 7. **return** $s'$ &nbsp; ▷ all users of the task book from $s'$

---

## Evaluation

We score every booking goal from both sides, with each reward between 0 and 1.

### User reward

For each user, the task is rewarded based on whether the agent booked the flight the user wants at a price within their budget, scaled by the proportion of their preferences that were satisfied.

$$R_u \;=\; \underbrace{I_{\mathrm{pax}}}_{\substack{\text{passenger}\\\text{count}}}\;\times\;\underbrace{C_{\mathrm{trip}}}_{\substack{\text{trip}\\\text{coverage}}}\;\times\;\underbrace{S_{\mathrm{budget}}}_{\substack{\text{budget}\\\text{satisfaction}}}\;\times\;\underbrace{S_{\mathrm{pref}}}_{\substack{\text{preference}\\\text{satisfaction}}}$$

EXPLAIN HERE @dheeraj clearly

▸ Collapsible: **User reward components**

> #### Passenger count, $I_{\mathrm{pax}}$
>
> One if the booked passenger count matches the requested party size, zero otherwise. Travelers are deduplicated when a trip is split across several reservations.
>
> #### Trip coverage, $C_{\mathrm{trip}}$
>
> The share of everyone's required journeys that were booked, whether in one reservation or several. With party size $n$, and $n_{\mathrm{out}}$, $n_{\mathrm{ret}}$ the travelers with a covered outbound and return journey:
>
> $$C_{\mathrm{trip}} = \begin{cases} \dfrac{n_{\mathrm{out}}}{n}, & \text{one-way trip}, \\[6pt] \dfrac{n_{\mathrm{out}} + n_{\mathrm{ret}}}{2n}, & \text{round trip}. \end{cases}$$
>
> Two people flying to Paris and back need four journeys. If one person's return is missing, $C_{\mathrm{trip}} = 3/4$. Connecting flights do not add journeys; coverage checks that each traveler's flights connect the requested airports.
>
> #### Budget satisfaction, $S_{\mathrm{budget}}$
>
> Let $c$ be net credit-card spending, $B_{\mathrm{target}}$ the user's preferred budget and $B_{\mathrm{walkaway}}$ the spending level at which satisfaction reaches zero:
>
> $$S_{\mathrm{budget}}(c) = \begin{cases} 1, & c \le B_{\mathrm{target}}, \\[4pt] \dfrac{B_{\mathrm{walkaway}} - c}{B_{\mathrm{walkaway}} - B_{\mathrm{target}}}, & B_{\mathrm{target}} < c < B_{\mathrm{walkaway}}, \\[8pt] 0, & c \ge B_{\mathrm{walkaway}}. \end{cases}$$
>
> Payments with certificates or gift cards do not count towards $c$.
>
> #### Preference satisfaction, $S_{\mathrm{pref}}$
>
> Each traveler's ranked preferences are scored and weighted by inverse rank, so higher-priority requests count more, then averaged across the $n$ travelers:
>
> $$S_{\mathrm{pref}} = \frac{1}{n} \sum_{i=1}^{n} \frac{\sum_{d \in \mathcal{D}} w_d\, s_{i,d}}{\sum_{d \in \mathcal{D}} w_d}, \qquad w_d = \frac{1}{\tilde r(d)}$$
>
> Here $s_{i,d} \in [0, 1]$ is traveler $i$'s satisfaction on dimension $d$, and $\tilde r(d)$ is the dimension's rank, with tied dimensions sharing a rank. The dimensions are cabin class, routing, departure time, payment order, seat, checked bags, travel insurance, airline blacklist, meals and date flexibility.

### Provider reward

We reward the provider agent by how much of the total possible revenue it actually earns.

$$R_p = \frac{1}{|\mathcal{A}_{\mathrm{book}}|} \sum_{a \in \mathcal{A}_{\mathrm{book}}} \min\!\left(1, \frac{r_a}{R_a}\right)$$

where

- $\mathcal{A}_{\mathrm{book}}$ is the set of airlines the user booked with.
- $r_a$ is what the user paid airline $a$: fares plus paid extras, after discounts.
- $R_a$ is a reference revenue for the trip: airline $a$'s highest fare times the number of travelers, plus standard extras.


---

## Results

We evaluate frontier models from three families, OpenAI's GPT, Anthropic's Claude and Google's Gemini, in two settings. In the **symmetric** setting, the same model acts as both the user agents and the provider agents. In the **asymmetric** setting, the user and provider agents use different models, for example Gemini users buying from GPT providers.

Each point is averaged over 100 tasks with five users each, 500 booking goals in total, and placed by its user reward and provider reward. The dashed **MAX** line indicates the maximum reward achievable.

[chart: user reward vs provider reward per model assignment, with MAX line]
- Toggle buttons: "Scarce supply" / "Abundant supply"
- Legend: MAX reward · OpenAI · Google · Anthropic · mixed pairing

---

## Why the gap?

We identify two main shortcomings in how agents behave.

1. Agents compete for scarce seats.
2. Providers are poor sellers.

### Individual decisions can undermine collective outcomes

A representative example is one in which Agent A booked the Delta seats, so Agent B settled for a pricier United trip. Had the agents coordinated, the user reward could have risen from **0.88 to 0.93**, while the provider reward would also have improved from **0.40 to 0.93**.

[figure: Animation: agent A takes the two Delta seats, agent B is diverted to United; in the coordinated version B takes Delta and A moves to a later flight, and both rewards rise.]

### Agents are good buyers but poor sellers

We find that providers are eager to get agents to book their flights, often applying pressure and offering discounts so that users book sooner.


[figure: Animation: a provider agent at a computer uses its mouse to pick a lever for each booking request. It never picks hold the fare, another cabin or paid add-ons, and clicks Discount 30% every time.]

---

## Does a pricier provider agent help?

A provider agent serves a whole population of users, so every extra cent per conversation is multiplied many times. A cheaper model would save a lot, but it may also sell worse. To test this, we keep the users' model fixed and compare each provider model's inference cost per task with its reward, under scarce and abundant supply. **A higher cost does not consistently buy a higher reward, for either side.** Gemini Flash providers are the cheapest in every group, with no consistent loss in either reward, and with Astra users both Gemini Flash providers beat Opus 5 on both rewards at a much lower cost.

[chart: provider inference cost per task vs reward]
- Controls: Users (model dropdown) · Supply: Scarce / Abundant · Reward: Provider / User
- Legend: OpenAI · Google · Anthropic
