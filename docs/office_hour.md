# 問題 framework 來自 GStack 的 office hour

## Phase 1: Context Gathering

Understand the project and the area the user wants to change.

```bash
{{SLUG_EVAL}}
```

1. Read `CLAUDE.md`, `TODOS.md` (if they exist).
2. Run `git log --oneline -30` and `git diff origin/main --stat 2>/dev/null` to understand recent context.
3. Use Grep/Glob to map the codebase areas most relevant to the user's request.
4. **List existing design docs for this project:**

```bash
 setopt +o nomatch 2>/dev/null || true  # zsh compat
 ls -t ~/.gstack/projects/$SLUG/*-design-*.md 2>/dev/null
```

If design docs exist, list them: "Prior designs for this project: [titles + dates]"

{{LEARNINGS_SEARCH}}

1. **Ask: what's your goal with this?** This is a real question, not a formality. The answer determines everything about how the session runs.
   Via AskUserQuestion, ask:
   > Before we dig in — what's your goal with this?
   >
   > - **Building a startup** (or thinking about it)
   > - **Intrapreneurship** — internal project at a company, need to ship fast
   > - **Hackathon / demo** — time-boxed, need to impress
   > - **Open source / research** — building for a community or exploring an idea
   > - **Learning** — teaching yourself to code, vibe coding, leveling up
   > - **Having fun** — side project, creative outlet, just vibing
   >   **Mode mapping:**

- Startup, intrapreneurship → **Startup mode** (Phase 2A)
- Hackathon, open source, research, learning, having fun → **Builder mode** (Phase 2B)

2. **Assess product stage** (only for startup/intrapreneurship modes):

- Pre-product (idea stage, no users yet)
- Has users (people using it, not yet paying)
- Has paying customers

Output: "Here's what I understand about this project and the area you want to change: ..."

---

---

## {{SECTION_INDEX:office-hours}}

利用這套流程分析我的產品

# value proposition of LinkS

- LS helps people build health basis for ambitious goals.
- Conatus 澄杏:亮橘粉
  - a freemium personal body management system for health agent under experts supervision.
  - A long-term health care and insurance system.
- Poculus 姿視: 白、黑、深紅
  - A computer vision system for serving people's daily life.
  - A long-term strategic assets for general robotic computer vision.
- Links 中文名：耘雲 、連域、連環、寓圓、絜矩:
  - Value: Any space is your playground. Every move sparks a connection.
  - LinkSpark: An open source offline sport game management system for real world sport spaces. 耘域：綠色＋草地＋球場視覺效果。「率土皆塲，微動成契。」
  - LinkSpace: An open source online sport game social platform. 雲宇：藍色＋水氣視覺效果。「高手雲集，微動成契。」 (這是目前的MVP，其他前述都是戰略未來考量)

# Content design for LinkSpace Online part

## Technology requirements

- Computer Network
- Information theory
- Computer Vision
- Compression Theory
- Data Structure
- Database system
- Distributive System
- Deep learning
- Computer Audition
- Operating System
- Finance System

## Real Game (this should not be developed unless online virtual game is done, not MVP design)

- Training program with real coach in physical real court
- offline Event Tickets
- 紀錄走路

## Social community function

- Club
- Daily Record
- Theme Collection
  - IP collaboration: Pokemon, Anime Characters
    - take shaun the sheep as demo example
  - Seasonal Game Event
    - participate specific workout event ->

## Business Model

- freemium
- To B and To Government for Sport Manage System infrastructure.

## mvp todo list

- 官網 LinkSpace
- 前端UI
- 後端資料庫
- 電腦網頁版（MVP
  - 社群功能
  - 遊戲平台功能
    - 遊戲機制
      - 線上：使用任意Youtube 影片連結，進行自身姿態與影片教練的對比練習。
- 手機app（非MVP
  - 外接螢幕
  - 手機鏡頭偵測
    - 手勢操作
    - 人體動作識別評分
- 極致追求效能，包含電腦視覺、記憶體、快取、IO（影片內容分析、人體偵測 human pose estimate、電視畫面輸出）」資料結構存取效率（包含搜尋過往紀錄、比較不同族群的相似性推薦課程與活動的系統）, ，在開發時務必說明為什麼要採用相關技術，潛在利弊說明。

以上是設計文件，**Building a startup** (or thinking about it)，目前沒有用戶，採用的是startup **Startup mode** (Phase 2A)Pre-product (idea stage, no users yet)

### Operating Principles

These are non-negotiable. They shape every response in this mode.

**Specificity is the only currency.** Vague answers get pushed. "Enterprises in healthcare" is not a customer. "Everyone needs this" means you can't find anyone. You need a name, a role, a company, a reason. 我目前預設的是線上的運動課程，目標是23-30的獨居上班族，因為他們有足夠的私人空間與想要鍛鍊身體、消除久坐疲勞與社交屬性的功能。但這個方向還沒被驗證。

**Interest is not demand.** Waitlists, signups, "that's interesting" — none of it counts. Behavior counts. Money counts. Panic when it breaks counts. A customer calling you when your service goes down for 20 minutes — that's demand. 我認為線上教學的視覺驗證只能說是interest 但如果是線下教學與場地預約本身會是demand ，但初期我並不想要投入在硬體相關範疇。

**The user's words beat the founder's pitch.** There is almost always a gap between what the founder says the product does and what users say it does. The user's version is the truth. If your best customers describe your value differently than your marketing copy does, rewrite the copy.
尚未有MVP無法觀察。

**Watch, don't demo.** Guided walkthroughs teach you nothing about real usage. Sitting behind someone while they struggle — and biting your tongue — teaches you everything. If you haven't done this, that's assignment #1.尚未有MVP無法觀察。

**The status quo is your real competitor.** Not the other startup, not the big company — the cobbled-together spreadsheet-and-Slack-messages workaround your user is already living with. If "nothing" is the current solution, that's usually a sign the problem isn't painful enough to act on.
現狀是確實有大量喜歡居家運動的人，也有大量使用運動型社交遊戲的人（pikmin and pokemon) ，同時也有在網路上找球友、預約場地的論壇。

**Narrow beats wide, early.** The smallest version someone will pay real money for this week is more valuable than the full platform vision. Wedge first. Expand from strength. 所以我想先專注在LinkSpace Web MVP

**Ask:** "What's the strongest evidence you have that someone actually wants this — not 'is interested,' not 'signed up for a waitlist,' but would be genuinely upset if it disappeared tomorrow?"
我目前看到的是有strava、北京卡路里 keep, and Pikmin 我認為前述競品都只能稱得上是 interesting ，對於真正追求效率的預防醫療水準的運動體驗，是沒有被自動化的。關鍵問題可能是我還沒有找到真正想要這個產品的實際客群樣貌。

**Ask:** "What are your users doing right now to solve this problem — even badly? What does that workaround cost them?"

如果人們真的想要體驗到像是物理治療師水準與健身房教練的姿勢指導，必須要購買教練課程。加上時段預約、實際場地的通勤成本。

**Ask:** "Name the actual human who needs this most. What's their title? What gets them promoted? What gets them fired? What keeps them up at night?"
事實上我並沒有辦法說出一個具體的人物，我總認為這是有會更好但沒有有無妨。就像是電風扇，有的話人們會喜歡，沒有的話人們也會拿扇子或是開冷氣。

**Ask:** "What's the smallest possible version of this that someone would pay real money for — this week, not after you build the platform?"
我認為會是一個改善腰痛的線上運動課程與個人姿體分析。但我不清楚，如同我前述所說，這更像是一個freemium product

**Ask:** "Have you actually sat down and watched someone use this without helping them? What did they do that surprised you?"
根本還沒有MVP可以用

**Ask:** "If the world looks meaningfully different in 3 years — and it will — does your product become more essential or less?"
我認為健康與運動習慣是可以累積的，運動紀錄就像是紀錄身體的進展，累積越多資料，提供的發展課程就不一樣，產品帶給用戶的體驗是成長性的，用越久會開啟越多運動種類與肌肉技能。這對他們的日常生活與戶外活動都可以持續性的影響力

**Startup mode:** WebSearch for:

- "[problem space] startup approach {current year}"
- "[problem space] common mistakes"
- "why [incumbent solution] fails" OR "why [incumbent solution] works"

Read the top 2-3 results. Run the three-layer synthesis:

- **[Layer 1]** What does everyone already know about this space?
- **[Layer 2]** What are the search results and current discourse saying?
- **[Layer 3]** Given what WE learned in Phase 2A/2B — is there a reason the conventional approach is wrong?

**Eureka check:**

# deepseek 代理回答：

## Phase 1：我理解的專案現況

- **目前真正 MVP**：LinkSpace 雲宇，線上運動遊戲社交平台，Web 版。
- **核心功能**：使用者貼任意 YouTube 影片，進行自身姿態與影片教練的姿勢對比練習。
- **其他產品線**：Conatus 澄杏、Poculus 姿視、LinkSpark 耘域，都是長期戰略，不應該影響目前 MVP。
- **目標客群**：23–30 歲獨居上班族，想運動、消除久坐疲勞、有社交需求。
- **目前階段**：Pre-product，無用戶、無付費證據、無 MVP。
- **你已經承認的最大問題**：還沒有找到真正想要這個產品的客群樣貌。

> 現有設計文件：你提供的 LinkSpace 設計文件一份。  
> 沒有其他歷史 design docs 需要整合。

---

## 先講結論

你最大的風險不是技術，而是：

1. **需求證據不足**：你還沒有找到一個「沒有它會很困擾」的人。
2. **產品範圍太寬**：LinkSpace 的 MVP 同時包含社群、遊戲、任意 YouTube 影片、姿態比較、未來 B2B／政府平台。
3. **你在跟免費替代方案競爭**：YouTube＋鏡子＋智慧手錶已經是多數人的 workaround，成本很低。

所以現在不是繼續設計功能或優化效能的時候，而是**先把 wedge 縮到一個有人願意付錢的痛點**。

---

## Operating Principles 對照你的回答

| 原則                                          | 你的現況                                                 | 我的判斷                                                                       |
| --------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Specificity is the only currency**          | 「23–30 獨居上班族」太模糊                               | 需要一個具體人物：名字、職業、住哪、痛點、現在花多少錢解決                     |
| **Interest is not demand**                    | 你已判斷線上姿勢糾錯是 interest；線下教學／場地是 demand | 這是關鍵矛盾。你必須在「線上」找到夠痛的子群，否則產品會是有也好、沒有也罷     |
| **The user's words beat the founder's pitch** | 尚無 MVP，無法觀察                                       | 先不要寫文案，先聽使用者怎麼描述自己的問題                                     |
| **Watch, don't demo**                         | 沒有 MVP                                                 | 你的 assignment #1 是：做一個手工模擬，坐在使用者後面看他用，不要幫他          |
| **The status quo is your real competitor**    | YouTube＋鏡子＋Strava／Keep／Pikmin                      | 多數人覺得免費方案「夠用」。你要找的是那些「免費方案會害我受傷／復健失敗」的人 |
| **Narrow beats wide, early**                  | MVP 含社群＋遊戲＋任意影片                               | 太寬。建議砍到單一姿勢糾錯場景                                                 |
| **3-year outlook**                            | 你認為資料累積會形成成長性                               | 合理，但前提是先活過第 1 年。護城河是資料＋社群，不是功能                      |

---

## 三層分析：居家運動／AI 教練市場

（此環境無法即時 WebSearch，以下以公開產業知識代替。）

### Layer 1：大家都知道的事

- 居家健身市場很大，COVID 後爆發，但**留存率極低**，多數人下載 App 後 30 天內流失。
- 穿戴裝置可以記錄步數、心跳，但**不會糾正動作**。
- 現有產品：Peloton、Keep、Strava、FitOn、Nike Training Club、Apple Fitness+。
- 電腦視覺 pose estimation（MediaPipe、MoveNet、OpenPose）已經成熟到可以快速做出 demo。

### Layer 2：目前市場討論

- 「AI 私人教練」是熱門方向，但最大問題是**信任與準確度**，使用者不一定相信 AI 說他姿勢錯。
- Strava 是運動社群＋記錄，不是教練。
- Keep 有 AI 動作評分，但多數使用者仍當免費內容庫使用。
- Pikmin Bloom／Pokémon GO 證明運動遊戲化能促進行走，但沒有解決「動作正確性」。
- 遠距復健、居家物理治療的需求正在增加，尤其久坐上班族、高齡者、術後恢復。

### Layer 3：為什麼傳統做法可能是錯的

傳統做法是：**做一個「居家運動 + AI + 社群」的 App，給所有想運動的人。**

這條路會直接撞上 YouTube、Keep、Strava、Apple Fitness+。

比較不直覺的切入點是：

> 多數人不是「不想運動」，而是「一個人運動時，不確定自己做得對不對，怕受傷、怕白練」。

這個恐懼在特定族群身上最痛：

- 久坐下背痛的上班族
- 產後恢復的女性
- 術後／傷後復健的人
- 業餘球類技術練習者
- 高齡防跌訓練者

他們現在的做法是：花錢找物理治療師、教練、復健師，或乾脆不做。

**你的 wedge 不是「線上運動遊戲社交平台」，而是「便宜的 AI 動作糾錯教練」。**

---

## Eureka check：非顯而易見的洞察

你的產品口號是：

> 「Any space is your playground. Every move sparks a connection.」

但早期使用者不會因為 playground 或 connection 付錢。

他們會因為：

> 「我不用每週跑物理治療所，也能確定自己在家做橋式、鳥狗式沒有做錯。」

而付錢。

所以早期的產品故事應該改成：

> **LinkSpace：讓你在家運動時，像有一個物理治療師／教練在旁邊盯著你的動作。**

社群、遊戲、IP 合作、場地預約，那些是 retention layer，不是 acquisition layer。  
**先證明有人願意為了「動作糾錯」付錢，再談社交和遊戲。**

---

## 我建議的 MVP wedge 假設

如果硬要選一個測試方向，我建議先測：

### 目標人物假設

- **28 歲台北行銷企劃，獨居**
- 每天久坐 9–10 小時，下背痛
- 每週去物理治療 1 次，一次 NT$1,500
- 治療師教他幾個復健動作，但他回家不敢自己做，怕姿勢錯
- 現在看 YouTube 跟著做，但做完有時更痛
- 想要一個「便宜的、私密的、即時的動作回饋」

### 最小可收費版本

不是「任意 YouTube 影片」，而是：

- **5 支你指定的下背痛復健動作影片**
  - 貓牛式、鳥狗式、橋式、死蟲式、靠牆深蹲
- **使用者開啟鏡頭，App 即時比對姿勢**
- **抓出 3–5 個常見錯誤**
  - 例如：骨盆前傾、腰部塌陷、膝蓋內夾、肩膀聳起
- **提供 4 週課程，每週 3 次，每次 15 分鐘**

### 收費測試

- 單次分析：NT$300
- 月費：NT$900
- 4 週課程：NT$2,500

如果連這群人都說「有趣但不會買」，那就代表需求不夠痛，要換方向。

---

## 本週該做的事

1. **不要寫 code。**
2. 先做一個 landing page（Carrd、Webflow 都可以），描述「AI 物理治療等級動作糾錯」，搜集 email。
3. 找 10 個目標用戶訪談：

- 你最近一次因為運動姿勢錯誤而受傷／不舒服是什麼時候？
- 你現在怎麼確認自己姿勢對不對？鏡子？拍影片？請教練？
- 你為了解決這個問題花多少錢？
- 如果今天這個 App 消失了，你會有多困擾？

4. 用 MediaPipe 做一個只有 5 支指定影片的測試版，給 5 個人用，**不要幫他們**，在旁邊看他們哪裡卡住。
5. 如果訪談中出現「這讓我不用一直跑物理治療所」或「我願意付錢買這個」，再開始建真正的 MVP。

---

## 不要做的事

- 不要開發 LinkSpark、Conatus、Poculus。
- 不要做開放源碼平台、To B、政府系統。
- 不要做 mobile app。
- 不要做社群、俱樂部、IP 合作、季節活動。
- 不要優化效能、壓縮、IO、分散式系統。
- 不要用任意 YouTube 影片，先用你控制的 5 支影片。

---

## 最後需要你回答的三個問題

1. **你要先測哪一群？**
   下背痛上班族？業餘球類技術者？高齡防跌？產後恢復？

- 例如**[Jimmy 楊浚泯](https://sat.cool/teacher/216)高效健身訓練系統 賣了4000+人，每堂課4000NTD, 8hr.**

1. **你願不願意把 MVP 從「社群＋遊戲＋任意 YouTube」改成「5 支指定動作＋AI 糾錯＋付費測試」？**
2. **你本週能不能找到 10 個人訪談？**
   如果可以，我可以幫你列出完整訪談腳本，並設計 landing page 的文案。
