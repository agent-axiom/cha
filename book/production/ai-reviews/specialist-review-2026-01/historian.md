# Внутренняя AI-рецензия — историческая и синологическая проверка

- `reviewerType`: `AI agent`
- `role`: `historian`
- `cycleId`: `specialist-review-2026-01`
- `manifestSha256`: `e5de6b6d4e0d2d97b65f2cdfb64d0273f85ea45f4a0d82bab0d78d97411962f9`
- `proofSetSha256`: `afd02d9d2faa28032429b62b173e1baf2b75b1bb621ba8f9b211443f972945fc`
- `snapshotSha256`: `85c7e3dc9d80c9472c20f180eb8ac462a57660b6aab1afdc6b61111ab6f1cfcd`
- `reviewedAt`: `2026-07-18`
- `disclosure`: Рецензию выполнил AI-агент, а не человек и не аттестованный историк или синолог. Это внутренний редакционный аудит frozen-пакета; он не является внешним specialist approval, не подтверждает личность эксперта и не должен менять статус рецензий в `reviews.json`.

## Overall AI editorial verdict

**Changes requested. C: 0; I: 3; M: 1.**

Архитектура исторического повествования в целом сильная: рукопись последовательно отделяет миф Шэньнуна и местную память о Чжугэ Ляне от датируемых свидетельств; не превращает `荼` в автоматический синоним чая; не называет чай Фань Чо «пуэром»; маркирует Жуань Фу как цинскую ретроспективу; не переносит современный GI-стандарт в древность; корректно описывает Цзинмай как населённый и управляемый культурный ландшафт. Четыре популярных тезиса справедливо исключены в заявленном виде.

До печати нужны три содержательные правки: раскрыть вложенную атрибуцию источников у Чжао Сюэмина; восстановить подлинный фрагмент `梵天廬叢錄`, сохранив исключение только для составной цитаты; перестроить хронологию шу так, чтобы гуандунская линия 1955–1959 годов не выглядела лишь предысторией юньнаньских опытов 1973–1975 годов.

## Findings — C

Критических замечаний нет.

## Findings — I

### I1 — `hist-zhao-six-mountains`, `hist-qing-puer-administration`: список шести гор приписан Чжао без указания вложенного источника

- **Страницы:** `A-P036`, `A-P048`, `A-P049`, `A-P059`, `A-P060`, `A-P061`, `A-P074`, `A-P196`.
- **Проблема:** формулы «Чжао Сюэминь перечисляет» и «в тексте Чжао ... связаны управа, подчинённые горы и податная практика» сглаживают компилятивную структуру раздела. В `本草綱目拾遺` сведения разнесены по разным голосам: вводная локализация дана со ссылкой на `雲南志`, перечень шести гор — со ссылкой на `南詔備考`, а пятицзиневый `人頭茶` и ежегодная дань идут после авторской пометы `按`. Поэтому список подтверждён как материал, включённый Чжао в раздел, но не как его самостоятельное наблюдение или единый административный акт.
- **Evidence:** [факсимиле/транскрипция `本草綱目拾遺`, раздел 普洱茶, Chinese Text Project](https://ctext.org/dictionary.pl?chapter=194007&if=en&remap=gb&sid=7000&trid=1819504); [академический японский разбор источников о чае Юньнани, стр. 27–35 PDF](https://www.yunnan-k.jp/images/stories/20170717-41/03-iwama/%E3%83%95%E3%82%9A%E3%83%AD%E3%82%B7%E3%82%99%E3%82%A7%E3%82%AF%E3%82%BF%E8%B3%87%E6%96%99%EF%BC%9A%E8%8C%B6%E3%81%A8%E9%9B%B2%E5%8D%97.pdf).
- **Proposed wording/action:** заменить прямую атрибуцию на: «В разделе Чжао Сюэмина о пуэрском чае приведён со ссылкой на `南詔備考` перечень Юлэ, Гэдэн, Ибан, Манчжи, Маньчжуань и Маньса; это цинская передача более раннего/вложенного источника, а не полевое описание Чжао». На страницах об управлении разделить три слоя: `雲南志` — топоним и локализация; `南詔備考` — горы; `按` Чжао — форма, дань и частная редкость. В подписи к факсимиле показать маркеры цитирования.

### I2 — `hist-fantianlu-composite-quote`, `hist-popular-text-attribution-corrections`: составная цитата верно исключена, но подлинный пассаж `梵天廬叢錄` существует

- **Страницы:** registry-only exclusion; контекст `A-P052`, `A-P063`.
- **Проблема:** frozen claim сообщает, что точный текст и границы «остальной цитаты» в проверяемом издании не установлены. Доступен первичный скан `梵天廬叢錄`, где отдельный пассаж о пуэре действительно содержит `性溫味厚`, изготовление/обёртывание с `竹箬`, названия 易武 и 倚邦 и `價等兼金`. В нём нет `能治百病`: эта формула находится в разделе о пуэрской пасте у Чжао Сюэмина. Следовательно, пользовательская русская цитата остаётся недопустимой как единая цитата, но книгу нельзя оставлять с впечатлением, будто пассаж `梵天廬叢錄` не обнаружен вообще. Дополнительно `性溫味厚` не значит «мягкий вкус и нежный аромат», а `竹箬` — не «ствол бамбука».
- **Evidence:** [первичный скан `梵天廬叢錄`, том 18, Wikimedia Commons](https://upload.wikimedia.org/wikipedia/commons/f/fc/SSID-12435865_%E6%A2%B5%E5%A4%A9%E5%BB%AC%E5%8F%A2%E9%8C%84_18.pdf); [первичный текст `本草綱目拾遺`: `普洱茶膏能治百病`](https://ctext.org/dictionary.pl?chapter=194007&if=en&remap=gb&sid=7000&trid=1819504).
- **Proposed wording/action:** сохранить `confirm-exclusion` для составной цитаты, но заменить пояснение на: «В `梵天廬叢錄` обнаружен отдельный республиканский пассаж о пуэре, включая `性溫味厚`, бамбуковую листовую обёртку и `價等兼金`; `能治百病` в этом пассаже нет и присоединять его из Чжао нельзя». Дать дипломатическую транскрипцию по скану и отдельно проверенный перевод; не переводить `竹箬` как бамбуковый ствол. Переименовать страницу `A-P052`/подпись так, чтобы `[ОТКЛОНЕНО]` относилось к склейке и неверной атрибуции, а не к существованию исходного текста.

### I3 — `prod-shou-antecedents`, `prod-shou-chronology-disagreement`: хронология «рождения шу» должна включать гуандунскую разработку как самостоятельную ветвь

- **Страницы:** `A-P118`, `A-P119`, `A-P196`, `A-P197`.
- **Проблема:** рукопись называет гуандунское `潮水发酵` «технологической предпосылкой», после чего спор ограничивается Куньмином и Мэнхаем в 1973–1975 годах. Официальный местный стандарт Гуанчжоу `DB4401/T 258—2024` формулирует более сильную хронологию: техническая группа создана в 1955 году, первая партия пуэра с `渥堆` получена в 1957-м, первый прессованный шу — в 1959-м. Официальный ответ Юньнани, напротив, относит начало быстрой ферментации на Куньминской фабрике к 1973 году; Dayi заявляет успешный мэнхайский опыт в 1973-м. Эти источники описывают конкурирующие институциональные генеалогии. Их нельзя свести к одному спору о том, какая юньнаньская фабрика была первой.
- **Evidence:** [официальный стандарт Гуанчжоу `DB4401/T 258—2024`, приложение A, п. 10, стр. 18–19 PDF](https://scjgj.gz.gov.cn/attachment/7/7575/7575757/9561176.pdf); [официальный ответ Департамента сельского хозяйства Юньнани, 2018](https://nync.yn.gov.cn/html/2018/tianjianyibanli2018_0612/375055.html?cid=3406); [корпоративная хронология Menghai/Dayi](https://www.dayitea.com/en/da-yi-li-shi).
- **Proposed wording/action:** перестроить ленту в две ступени: «Гуандун/Fangcun: 1955–1959 — документируемая институциональная версия раннего искусственного влажного кучевания и прессованного шу»; «Юньнань: 1973–1975 — заимствование, адаптация и фабричная стабилизация технологии, с расхождением дат Куньмин/Мэнхай». Заголовок `A-P119` оставить как «Несколько хронологий одного новшества», но сделать спор межрегиональным. Не назначать одного изобретателя и прямо отметить, что стандарт 2024 года и поздние корпоративные истории — ретроспективные институциональные источники, а не журналы опытов 1950–1970-х.

## Findings — M

### M1 — `hist-ruan-retrospective`, `hist-xu-bowuzhi-western-fan`: вывод корректен, но печатной книге нужна более сильная цепочка к изданию Жуань Фу

- **Страницы:** `A-P053`, `A-P196`; registry-only exclusion.
- **Проблема:** смысл передан верно: Жуань Фу сначала цитирует Ли Ши и `續博物志`, а затем сам выводит `普洱古屬銀生府，西蕃之用普茶，已自唐時`. Но frozen bibliography опирается на веб-транскрипцию и сводную каталогическую запись, а не на постраничное факсимиле или научное издание `滇筆`. Для подарочного тиража этого достаточно для внутренней проверки смысла, но недостаточно для окончательной подписи факсимиле, датировки 1825/1826 и пунктуации.
- **Evidence:** [доступная транскрипция первичного текста `普洱茶記`](https://fo.sina.com.cn/culture/tea/2014-07-24/doc-ianfzhni9606584.shtml?from=wap); сам текст явно отделяет `李石《續博物志》稱` от последующего вывода Жуань Фу.
- **Proposed wording/action:** формулировку рукописи оставить, но перед финальным bibliography lock заменить access-copy на библиотечный скан или академическое комментированное издание с томом и страницами. До этого не давать репродукцию как «точное факсимиле `普洱茶記`» и не фиксировать спорную дату точнее, чем «эпоха Даогуан, обычно 1825–1826».

## Confirmed exclusions

1. **`hist-wuhou-records-east-han` — exclusion confirmed.** Проверяемого синхронного произведения «Записи У-хоу», которое сообщало бы о `ту ча` в Восточную Хань, frozen corpus не предъявляет. `武侯遗种` относится к поздней местной памяти о Чжугэ Ляне. Допустим только маркированный миф/локальное предание, не дата начала чаеводства. Source: [официальный историко-краеведческий материал города Пуэр](https://www.peds.gov.cn/tp_nr.asp?id=6849).
2. **`hist-puer-1700-years` — exclusion confirmed.** Непрерывная документированная история именно категории пуэра на 1700 лет не установлена: Фань Чо говорит о региональном чае Иньшэна без слова «пуэр», а цинские и современные определения относятся к иным временным слоям. Source: [первичный текст `蠻書`, книга 7](https://zh.wikisource.org/wiki/%E8%A0%BB%E6%9B%B8); [James A. Benn, *Tea in China*](https://academic.oup.com/hawaii-scholarship-online/book/29980/chapter-abstract/255043105).
3. **`hist-xu-bowuzhi-western-fan` — exclusion confirmed.** Формула о танском употреблении пуэрского чая у «Западной Фань» является выводом Жуань Фу эпохи Цин, а не прямой фразой южносунского `續博物志`. Source: [транскрипция `普洱茶記`](https://fo.sina.com.cn/culture/tea/2014-07-24/doc-ianfzhni9606584.shtml?from=wap).
4. **`hist-fantianlu-composite-quote` — composite exclusion confirmed with correction I2.** `能治百病` нельзя соединять с найденным пассажем `梵天廬叢錄` и выдавать результат за одну цитату. Сам подлинный пассаж при этом должен быть восстановлен и атрибутирован отдельно.

## Claims checked

### Deep primary-focus review — 25/25

`hist-shennong-legend`, `hist-tu-ambiguity`, `hist-early-tea-evidence`, `hist-warring-states-remains`, `hist-fan-chuo-yinsheng`, `hist-zhao-six-mountains`, `hist-zhao-hundred-illnesses`, `hist-zhao-author-name`, `hist-ruan-retrospective`, `hist-zhuge-liang-local-legend`, `hist-qing-puer-administration`, `hist-qing-tribute-tea`, `hist-tea-horse-road-framing`, `hist-modern-authenticity`, `hist-popular-antiquity-corrections`, `hist-popular-text-attribution-corrections`, `hist-pressing-transport-hypothesis`, `hist-twentieth-century-category-change`, `prod-shou-chronology-disagreement`, `prod-shou-antecedents`, `prod-modern-gi-definition`, `storage-regional-labels`, `mountain-jingmai-cultural-landscape`, `mountain-managed-tea-forest`, `medical-historical-hundred-illnesses`.

### Rejected-focus review — 4/4

`hist-wuhou-records-east-han`, `hist-puer-1700-years`, `hist-xu-bowuzhi-western-fan`, `hist-fantianlu-composite-quote`.

### Obvious-error screen of the remaining active corpus — 45/45

`prod-maocha-process`, `prod-sheng-shou-distinct`, `prod-shou-wodui-operations`, `prod-green-removal-scope`, `storage-controlled-conditions`, `storage-gbt30375-current`, `storage-mould-is-damage`, `storage-rh-aw-distinction`, `micro-method-boundaries`, `micro-abe-timecourse`, `micro-ma-lab-succession`, `micro-ma-chemical-shifts`, `micro-zhang-cross-sectional`, `micro-zhao-metaomics`, `micro-haas-market-safety`, `micro-chau-market-safety`, `micro-safety-method-dependent`, `medical-human-efficacy-is-extract-evidence`, `medical-weight-extract-evidence`, `medical-lipid-extract-evidence`, `medical-glycaemia-inconclusive`, `medical-enzyme-review-not-clinical`, `medical-caffeine-general-guidance`, `medical-pregnancy-caffeine-guidance`, `medical-caffeine-alertness-sleep`, `medical-chemistry-not-clinical-efficacy`, `medical-microbiome-preclinical`, `medical-antioxidant-assays-not-outcomes`, `medical-food-storage-safety`, `medical-mycotoxin-evidence-limited`, `medical-interactions-individualize`, `medical-no-universal-cup-limit`, `medical-tea-not-treatment`, `mountain-large-leaf-material`, `mountain-tree-age-boundary`, `prod-maocha-material-control`, `prod-shaqing-enzyme-scope`, `prod-steam-press-dry-functions`, `prod-wodui-not-compressed-aging`, `storage-no-guaranteed-improvement`, `micro-wodui-physical-gradients`, `micro-aroma-pathway-boundary`, `prod-material-attribution-boundaries`, `micro-causal-testing-boundaries`, `prod-maocha-process-visual-hypotheses`.

В этом втором проходе явных дополнительных исторических ошибок не обнаружено. Технологические, медицинские и микробиологические выводы вне исторической атрибуции не оценивались как профильное одобрение.

## Confirmed without requested wording change

- **Шэньнун:** корректно назван мифическим культурным героем; история не используется как календарная дата. Academic cross-check: [Benn, University of Hawai‘i Press/Oxford Academic](https://academic.oup.com/hawaii-scholarship-online/book/29980/chapter-abstract/255043105).
- **Ранний `荼`:** оговорка об амбивалентности знака сохранена; 59 год до н. э. отделён как критерий письменного свидетельства, а не как начало пуэра. Archaeological comparison: [Lu et al., *Scientific Reports*](https://pmc.ncbi.nlm.nih.gov/articles/PMC4704058/).
- **Воюющие царства:** рукопись точно передаёт вывод авторов и добавляет необходимую границу между идентификацией остатка и наблюдением акта питья. Source: [Jiang et al., *Scientific Reports*](https://doi.org/10.1038/s41598-021-95393-w).
- **Фань Чо:** `茶出銀生城界諸山，散收無採造法。蒙舍蠻以椒、薑、桂和烹而飲之` не назван пуэром и не превращён в современную технологию.
- **Цинская медицинская формула:** `普洱茶膏能治百病` ограничена исторической репрезентацией и не перенесена в медицинскую рекомендацию.
- **Tea-Horse Road:** рукопись корректно говорит о сети маршрутов и поздней объединяющей рамке, а не о вечной единой магистрали. Academic context: [Jinghong Zhang, University of Washington Press/De Gruyter](https://www.degruyterbrill.com/document/doi/10.1515/9780295804873/html).
- **GI:** `GB/T 22111-2008` на дату рецензии имеет официальный статус `现行`; книга правильно не применяет его ретроактивно. Source: [National Public Service Platform for Standards, PRC](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=CAF792AAE4A96101F217C44250C8C8E4).
- **Цзинмай:** объект действительно внесён в Список всемирного наследия в 2023 году как органически развившийся, населённый и управляемый культурный ландшафт. Source: [UNESCO World Heritage Centre](https://whc.unesco.org/en/list/1665/).

## Limitations

- Это AI-аудит доступных текстов и открытых цифровых копий, не внешняя рецензия человеком-историком и не палеографическая экспертиза оригиналов.
- Визуально проверен доступный первичный скан `梵天廬叢錄`; однако дипломатическую транскрипцию для печати следует независимо сверить синологу по изображению строки, особенно знаки вокруг `竹箬` и `價等兼金`.
- Для `普洱茶記` Жуань Фу в frozen corpus нет надёжного постраничного факсимиле; веб-транскрипция подтверждает логику пассажа, но не закрывает вопросы версии, пунктуации и точной даты.
- Источники хронологии шу преимущественно поздние официальные, региональные и корпоративные реконструкции. Они позволяют показать конфликт версий, но не заменяют производственные журналы 1950–1970-х; поэтому нельзя назначать единственного изобретателя.
- Проверка 45 непрофильных active claims ограничивалась очевидными историческими и синологическими ошибками. Медицинская эффективность, производственные режимы, микробиология и безопасность требуют отдельных профильных рецензий.
