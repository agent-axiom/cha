# Пуэр и здоровье: редакционное медицинское досье

Дата поиска и внутренней проверки: 21 июля 2026 года.

Статус: редакционный черновик. Внешняя проверка лицензированным врачом или клиническим фармакологом не получена. Все медицинские claims имеют статус не выше `checked` или `rejected`; внутренние аудиты в `reviews.json` остаются `pending` и не заменяют медицинскую рецензию.

## Воспроизводимый поиск и PRISMA-lite

Полные строки запросов, фильтры, полученные счётчики, число просмотренных записей и включённые source IDs сохраняются в `medical-search-log.csv`. Поиск охватывает PubMed, Crossref, китайский индекс, WHO, EFSA и официальный food-safety источник. Crossref выполняет нечёткий поиск релевантности, поэтому его большой счётчик служит только для discovery и не является числом исследований пуэра.

### Критерии включения

- человеческие исследования именно пуэра/Pu-erh/Puer с идентифицируемым вмешательством или экспозицией;
- актуальные официальные рекомендации по кофеину, беременности и применимые документы по пищевой безопасности;
- систематические обзоры только если вопрос и включённый корпус непосредственно относятся к пуэру;
- животные, клетки, химические assays и механистические microbiome-работы — только контекст уровня `medical-d`, без переноса причинного эффекта на людей;
- цинские лечебные формулы — только атрибутированное историческое представление уровня `medical-e`.

### Критерии исключения

Исключаются общие обзоры зелёного/чёрного чая без отдельного результата для пуэра, in vitro/animal результаты как доказательство эффективности у людей, маркетинговые страницы, недоступные тезисы без проверяемой записи и дубликаты одной работы. Экстракты и изолированные соединения не приравниваются к обычному настою.

### Поток отбора

Исходный воспроизводимый PubMed ESearch 17 июля с добавленными вариантами `Puerh[Title/Abstract]` и `"Puerh tea"[Title/Abstract]` вернул 113 записей против 95 в первоначальной строке. Все 113 заголовков и доступные abstracts были просмотрены: 8 человеческих исследований и 1 pu-erh-specific systematic review вошли в тот срез. Citation chasing добавил второй обзор (`lin-2019-meta`). Wanfang Medical и fuzzy-поиск Crossref использовались только для discovery и не интерпретировались как размер корпуса.

Целевое обновление 21 июля проверило публикации и реестры, отсутствовавшие в первоначальном наборе: `takeda-2019-powdered-beverage`, `sun-2024-y562-human`, `sun-2025-citrus-puer-human`, `li-2026-theabrownin-human`, `zhao-2026-ripened-review`, `nct03613688` и `umin000053941`. Это дополнение зарегистрировано отдельными строками в CSV и не объявляется полным повторным ESearch: оно исправляет датированный корпус, не создавая ложной точности нового общего счётчика.

Для воспроизводимости ниже сохранены полные ID lists первоначального ESearch от 17 июля 2026 года; они не выдаются за текущий исчерпывающий список.

<details>
<summary>Исходный список: 95 PMID</summary>

`42225041,42172884,42150099,42037092,41990501,41830542,41437720,41297411,41267248,40884184,40875308,40858051,40467208,40250220,40179506,39948758,39654443,39615110,39332361,39232541,38639730,38284642,37092796,36592713,35635519,35566203,35452322,35337597,35164318,34613845,34018615,33962815,33743430,33233112,32730889,32419453,31905107,31896450,31672964,31631665,31625054,31455758,31256543,31143917,31070363,30907897,30781621,30449099,30350970,30119205,29745730,29061705,28822144,28417981,28366855,28164196,27539359,27069360,27001463,26647101,26299992,25820466,25799937,25659129,25308103,24945996,24938891,24804206,24779940,23993592,23831194,24579782,23106150,22980794,22957968,22855451,22559253,22482420,21870867,21745623,21725873,21673927,24779659,20970486,20804837,20492177,19459711,19320437,19083445,18769024,18455823,17032009,16925113,11302190,1402092`

</details>

<details>
<summary>Исправленный список: 113 PMID</summary>

`42225041,42172884,42150099,42037092,41991056,41990501,41830542,41437720,41297411,41267248,40922143,40884184,40875308,40858051,40467208,40263873,40253126,40250220,40179506,39948758,39654443,39615110,39332361,39232541,38639730,38284642,37092796,36876534,36592713,35635519,35566203,35564885,35452322,35337597,35164318,34613845,34018615,33962815,33743430,33233112,32730889,32419453,31905107,31896450,31793087,31672964,31631665,31625054,31623411,31558747,31455758,31256546,31256543,31143917,31070363,30907897,30781621,30449099,30350970,30119205,29903299,29745730,29061705,28822144,28417981,28366855,28164196,27539359,27069360,27001463,26647101,26299992,25820466,25799937,25659129,25308103,24945996,24938891,24804206,24779940,24399768,23994784,23993592,23831194,23578062,24579782,23106150,22980794,22957968,22855451,22559253,22482420,21870867,21745623,21725873,21673927,24779659,20970486,20804837,20492177,20413147,19459711,19320437,19083445,18769024,18455823,18078704,17032009,16925113,16404708,16194025,11302190,1402092`

</details>

Новые 18 PMID: `41991056,40922143,40263873,40253126,36876534,35564885,31793087,31623411,31558747,31256546,29903299,24399768,23994784,23578062,20413147,18078704,16404708,16194025`. Screening decisions: PMID 24399768 и 16194025 включены; PMID 41991056 изучает L-theanine, а не пуэр; PMID 31793087, 31623411, 23994784 и 16404708 — общие reviews без отдельного применимого human Pu-erh result; PMID 20413147 — survey/modelled exposure без measured human outcome; остальные 10 — product chemistry/food analysis, in-vitro/cell work или sensory study без human clinical outcome.

Дедупликация выполнялась по DOI или PMID, затем по нормализованной паре «точное название + первый автор + год». Результаты разных баз не складывались. После title/abstract screening проверялись тип продукта, человеческая выборка, comparator и доступность исходных чисел. Полный или расширенный открытый текст доступен для Jensen, Takeda, Sun 2024, Sun 2025 и Li 2026; для части старых записей использованы только abstracts и библиографические metadata. ACS supporting PDF Xie et al. вернул WAF challenge; недоступные поля не реконструировались.

WHO, EFSA, FDA и SAMR не показали стабильного счётчика результатов для сохранённых site queries; поэтому в CSV стоит `not reported`, а `screened_count` отражает только фактически открытые официальные страницы. CNKI search endpoint имел проблему TLS certificate/hostname; вместо него использован доступный институциональный Wanfang Medical с опубликованным счётчиком 103.

## Карта типов и применимости

- `medical-a` — актуальная официальная рекомендация или применимая официальная оценка безопасности/риска для обозначенного вопроса, популяции и юрисдикции; это не доказательство пользы, универсальной безопасности или целевой дозы;
- `medical-b` — непосредственно применимый systematic review/meta-analysis;
- `medical-c` — человеческое интервенционное или наблюдательное исследование;
- `medical-d` — животный, клеточный, химический или microbiome-механизм;
- `medical-e` — традиционное историческое представление.

В registry после внутреннего аудита: `medical-a` — 6 claims, `medical-b` — 0, `medical-c` — 7 claims, `medical-d` — 4, `medical-e` — 1. Всего 18 medical claims: 17 `checked`, 1 `rejected`, 0 `verified`. Обзор Zhao 2026 существует, но его смешанный корпус не является непосредственно применимой опорой типа B для клинической пользы обычного настоя. Буква обозначает тип применимой опоры, а не величину эффекта или ранг качества; abstract language, review label и statistical significance не меняют тип данных.

## Человеческие исследования

В обновлённом корпусе формы принципиально различаются: таблетки и капсулы экстракта, порошковый напиток с экстрактом, растворимый пуэр, выделенный теабраунин, цитрусовый пуэр и конкретный коммерческий шу. Исследования преимущественно малы, коротки, иногда неконтролируемы и используют surrogate endpoints. Регистрация UMIN000053941 со статусом `Complete: follow-up continuing` важна тем, что изучает именно заваренный пакетированный чай, но запись реестра без опубликованных результатов не является evidence of efficacy. Клиническая польза обычного домашнего настоя не установлена.

Обязательная классификация intervention type: старые Fujita/Kubota/Chu/Yang/Jensen — **water/concentrated extract**; `takeda-2019-powdered-beverage` — **powdered beverage containing extract**; `sun-2024-y562-human` — **commercial ripened tea Y562**; `sun-2025-citrus-puer-human` — **citrus Pu-erh**; `li-2026-theabrownin-human` — **instant Pu-erh** в первом подисследовании и **isolated theabrownin** во втором. `xie-2012` и `zielinska-przyjemska-2005` остаются предварительно **brewed beverage** по abstract wording, но preparation/dose не сообщены. Формы не поддерживают dose equivalence.

| Source ID | Вмешательство | Доза и длительность | n: randomized / enrolled / analyzed | Comparator | Заранее заданный / главный outcome | Attrition | Adverse events | Funding / registration | Дизайн и риск смещения |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fujita-2008-safety` | Водный экстракт Pu-Ehr, таблетки; концентрированный экстракт, не обычный чай | Test 2: 0,75 или 1 г/день, 8 недель; test 3: 10 г однократно; test 4: 5 г/день, 5 недель; test 5: 1 г/день, 4 месяца | randomized: not reported in accessible text; enrolled: 20 / 10 / 11 / 21 по четырём human tests; analyzed: not reported in accessible text | Comparator/control details: not reported in accessible abstract | Primary outcome not identified as prespecified; safety labs, затем TC/LDL и масса тела | not reported in accessible text | Abstract сообщает отсутствие изменений выбранных hematology/biochemistry safety parameters; клинические adverse events отдельно not reported | Funding: not reported in accessible text; registration: not reported in accessible text | Несколько малых dose/safety studies и неконтролируемый 21-person efficacy test; выборочные surrogate endpoints, не клинические события |
| `fujita-2008-trial` | Водорастворимый Pu-Ehr extract в таблетках | 333 мг 3 раза/день перед едой (999 мг/день), 3 месяца | randomized: 47; enrolled: 47; analyzed: not reported in accessible text | Placebo tablets | Prespecified primary outcome not identified; TC/LDL, triglycerides, масса тела и safety biochemistry | not reported in accessible text | Abstract: жалоб на adverse effects, включая abdominal distension, не было; иные способы сбора AEs not reported | Funding: not reported in accessible text; registration: not reported in accessible text; оба автора аффилированы с Nippon Supplement, что не доказывает источник финансирования | Double-blind randomized group comparison; малый n, неизвестная attrition/registration, несколько surrogate endpoints |
| `kubota-2011` | Водный экстракт Pu-Erh в порошковом ячменном чае | 333 мг перед каждым из 3 приёмов пищи (999 мг/день), 12 недель + 4 недели follow-up | randomized: 36; enrolled: 36; analyzed: not reported in accessible text | Тот же порошковый ячменный чай без экстракта | Prespecified primary outcome not identified; масса/BMI/талия и CT visceral-fat area | not reported in accessible text | Abstract: участники BTE не жаловались на adverse effects such as abdominal distension; measured biochemistry без значимых различий | Funding: not reported in accessible text; registration: not reported in accessible text | Double-blind randomized placebo-controlled; малый n, неизвестная attrition, множественные surrogate endpoints |
| `chu-2011` | Pu'er tea extract в капсулах; концентрированный экстракт | Доза not reported in accessible abstract; 3 месяца | randomized: 90; enrolled: 90; analyzed: not reported in accessible text | Placebo capsules | Prespecified primary outcome не указан; BMI/waist-hip, glucose, lipids, inflammatory/oxidation markers | not reported in accessible text | not reported in accessible text | Funding: not reported in accessible text; registration: not reported in accessible text | Randomized double-blind placebo-controlled; abstract не даёт дозы, attrition, численных group effects или анализа multiplicity; высокий риск selective reporting/неясность |
| `xie-2012` | Ежедневное употребление пуэра; точная форма заваривания и доза not reported in accessible abstract | 2 недели baseline + 2 недели intake + 2 недели wash-out | randomized: not applicable; enrolled/analyzed: not reported in accessible text | Внутриличностные baseline/wash-out периоды | Metabonomic profile мочи и метаболическая судьба полифенолов; не клинический outcome | not reported in accessible text | not reported in accessible text | Funding: not reported in accessible abstract; registration: not reported in accessible text | Одногрупповое serial-sampling mechanistic human study; supporting PDF был заблокирован WAF, поэтому n/доза не восстановлены |
| `jensen-2016` | Puer tea extract powder, растворяемый в воде; концентрированный экстракт | 3 г/день (2 × 1,5 г), 20 недель | randomized: 59; enrolled: 59; completed: 49; analyzed: 48 после post-randomization исключения одного completer | Dextrin placebo powder | Prespecified primary outcome not identified; weight/body composition/lipids, glucose, CRP | 10/59 не завершили; ещё 1 completer исключён из анализа | 4 placebo и 1 PTE прекратили участие по разным медицинским причинам, включая смену medication/health status; причинная связь с продуктом не установлена, systematic AE collection не описан | Sponsor: Tasly Pharmaceuticals USA; 3/5 authors были сотрудниками sponsor; registration identifier not reported in full text | Randomized double-blind placebo-controlled; 18,6% не вошли в analysis, post-randomization exclusion, малый n, multiple endpoints и sponsor involvement |
| `yang-2014-weight` | Puerh tea extract capsule; концентрированный экстракт | 333 мг 3 раза/день (999 мг/день), 3 месяца | randomized: 70; enrolled: 70; analyzed: not reported in accessible abstract | Placebo; точная форма not reported in accessible abstract | Prespecified primary outcome not identified; weight/BMI, glucose, HbA1c и lipids | not reported in accessible abstract | not reported in accessible abstract | Funding: not reported in accessible abstract; registration: not reported in accessible abstract | Randomized two-group abstract-only study; значимого overall between-group эффекта weight/BMI не показано, сигнал только в male subgroup; малый n, subgroup analysis и неизвестные attrition/blinding/multiplicity |
| `zielinska-przyjemska-2005` | Употребление red tea Pu-Erh; preparation и dose not reported; mixed in-vitro neutrophil component | Measurements после 1 и 5 месяцев; regimen not reported in accessible abstract | randomized: not applicable/not reported; enrolled: 14 obese women; analyzed: not reported | Healthy blood donors упомянуты как control; число и применимость к tea-drinking comparison неясны | ROS generation и CRP biomarkers; не clinical outcome | not reported in accessible abstract | not reported in accessible abstract | Funding: not reported in accessible abstract; registration: not reported in accessible abstract | Малое abstract-only case-control/mechanistic study; неизвестны dose, allocation, attrition и comparator structure; partly in vitro, поэтому clinical applicability очень низкая |
| `takeda-2019-powdered-beverage` | Порошковый напиток с экстрактом пуэра | Однократно вместе с cooked-rice load | enrolled: 20; analyzed: 17 после исключения трёх | Placebo beverage, crossover | Postprandial glucose/AUC до 120 минут | 3/20 исключены из анализа из-за различий предшествующего питания | not reported on article page | Registration/funding not established from checked page | Малый разовый crossover; postprandial surrogate, не долговременная клиническая польза |
| `sun-2024-y562-human` | Коммерческий шу Y562 | 3 месяца | enrolled: 45 | Нет параллельной контрольной группы | Множество body-composition, glucose/lipid, liver-fat и microbiome endpoints | Проверяется по full text; не превращается в контроль | См. full text | Коммерческий продукт назван; независимость результата оценивается отдельно | Одногрупповое pre/post сравнение, multiple endpoints, regression-to-mean и поведенческие confounders |
| `sun-2025-citrus-puer-human` | Цитрусовый пуэр | 3 недели | pilot sample; точное n не переносится из недоступного фрагмента | Контрольная структура не установлена из проверенной abstract page | Body-fat distribution и gut microbiome | not established from checked abstract | not established from checked abstract | Два автора аффилированы с Tingyi; это disclosure context, не автоматическое опровержение | Короткий human pilot объединён с mouse study; специальный смешанный продукт и surrogate endpoints |
| `li-2026-theabrownin-human` | Study 1: instant Pu-erh; Study 2: isolated theabrownin | 4 недели; затем отдельная single-dose mechanistic study | Study 1: 40; Study 2: 74 | Study 1: pre/post без parallel placebo; Study 2: два OMTT | Postprandial glucose, tolerance tests и механистические показатели | not reported as clinical attrition in checked sections | not established as systematic safety endpoint | ChiCTR2400091051; среди аффилиаций есть Tasly Research Institute, authors declare no conflict | Два малых substudies, sex/subgroup comparisons и surrogate endpoints; нужны независимые replication и patient-important outcomes |

Абсолютные эффекты из abstract/full text не переносятся между endpoint definitions. Jensen et al. сообщает среднее снижение массы внутри PTE group примерно на 1 кг и significant междугрупповую разницу BMI на 20-й неделе, но численный absolute between-group contrast для массы/BMI в тексте не дан; total/regional fat, cholesterol, HDL и LDL между группами значимо не различались, triglycerides дали лишь trend. Yang et al. сообщает 1,3 кг внутри extract arm против 0,23 кг внутри placebo arm, но значимого overall between-group weight/BMI effect не показано; p=0,004 для weight и BMI относится только к male subgroup и не является общим эффектом. Для остальных abstracts отсутствие полноценной численной between-group таблицы означает, что magnitude остаётся `not reported in accessible text`.

## Редакционные выводы об эффективности

Найдены три pu-erh-specific systematic reviews. Yang 2019 включает heterogeneous enzyme assays/in vitro/mouse evidence; Lin 2019 meta-analyzed две mouse studies. Zhao 2026 сообщает 351 публикацию и 23 clinical trial investigations, но объединяет человеческие исследования разных продуктов и дизайнов с доклиническими механизмами. Для вопроса о клинической пользе домашнего настоя этот обзор остаётся непрямым `medical-d`, а не автоматически применимым `medical-b` (`medical-enzyme-review-not-clinical`).

**Вес и body composition.** Старые extract studies дополнены неконтролируемым трёхмесячным исследованием коммерческого Y562 и трёхнедельным pilot цитрусового пуэра. Jensen имел 59 randomized и 48 analyzed, sponsor Tasly и 3/5 авторов-сотрудников; Yang не показал значимого overall weight/BMI effect, а сигнал ограничился male subgroup. Новые специальные продукты и pre/post/pilot designs не устраняют attrition, multiplicity и отсутствие независимого крупного подтверждения. Устойчивый clinically important effect обычного настоя не установлен (`medical-weight-extract-evidence`).

**Липиды и cardiovascular claims.** Корпус включает исследования экстрактов и коммерческого шу Y562. В Sun 2024 использовано неконтролируемое сравнение до/после без параллельной контрольной группы; множество показателей и сравнений повышает риск случайных сигналов. Во всех этих работах измерялись cholesterol fractions и triglycerides — surrogate endpoints, не инфаркт, инсульт, cardiovascular mortality или medication reduction. У Jensen et al. cholesterol, HDL и LDL не различались между группами, а triglycerides дали trend; у Yang et al. cholesterol и triglycerides не изменились значимо. Положительные within-group изменения нельзя выдавать за placebo-controlled effect. Нельзя утверждать cardiovascular prevention или замену lipid-lowering therapy (`medical-lipid-extract-evidence`).

**Гликемия.** К старым неполным/нулевым between-group результатам добавились: разовый crossover Takeda с 17 проанализированными участниками, неконтролируемый Y562 pre/post study и два малых substudies Li 2026 с instant tea и isolated theabrownin. Это краткие postprandial и лабораторные surrogate endpoints, а не предотвращённые осложнения или доказанная терапия. Evidence остаётся неоднородным; пуэр не является средством лечения или профилактики диабета (`medical-glycaemia-inconclusive`).

**Микробиом.** Type D объединяет animal, in vitro и mechanistic evidence; этот слой формирует гипотезы и не переносится на людей напрямую. Отдельный Type C слой включает малые human pilot/pre-post работы Sun 2024, Sun 2025 и Li 2026 со специальными продуктами и суррогатными метаболическими или микробиомными показателями. Они не устанавливают клиническое улучшение пищеварения, иммунитета или обмена веществ (`medical-microbiome-preclinical`).

**Самый сильный безопасный вывод.** Расширенный корпус увеличил разнообразие человеческих данных, но не их прямую применимость: экстракт, instant product, теабраунин, citrus blend и один коммерческий шу не образуют единое вмешательство. Малые, короткие и частично неконтролируемые исследования дают hypothesis-generating сигналы по surrogate endpoints. Они не доказывают clinically important benefit домашнего настоя и не поддерживают disease-treatment, detox, cancer-prevention или medicine-replacement claims (`medical-human-efficacy-is-extract-evidence`; `medical-disease-claims-rejected`).

## Безопасность и применимые рекомендации

### Кофеин, бодрость и сон

Пуэр содержит кофеин, но содержание конкретной порции зависит от листа, партии, массы, температуры, времени, числа проливов и объёма. EFSA указывает для **здоровых взрослых** отсутствие safety concern при single dose до 200 мг и total intake до 400 мг/день из всех источников; FDA также cites 400 мг/день для большинства взрослых, подчёркивая широкую variability чувствительности и скорости выведения. Это не target, не гарантия для каждого и не число чашек пуэра.

Кофеин может повысить бодрость и уменьшить сонливость; это не уникальное лечебное свойство пуэра. По EFSA, уже 100 мг single dose у некоторых взрослых может влиять на длительность и pattern сна, особенно близко ко времени сна. Практический вывод — учитывать timing и собственную реакцию; при insomnia, palpitations, anxiety, tremor или GI discomfort уменьшать exposure и обсуждать симптомы с healthcare professional (`medical-caffeine-alertness-sleep`).

### Беременность и лактация

Два официальных ориентира нельзя сливать. WHO eLENA (global, context-specific) рекомендует беременным с **высоким intake свыше 300 мг/день** снижать ежедневный кофеин для уменьшения риска pregnancy loss и low-birth-weight neonates. EFSA (EU risk assessment) считает intake **до 200 мг/день из всех источников** не вызывающим safety concern для плода; та же страница относит этот уровень к pregnant/lactating women. Оба числа относятся к **сумме** чая, кофе, cola/energy drinks, chocolate, supplements и medicines, а не к чашкам пуэра. Local obstetric guidance и индивидуальная рекомендация clinician имеют приоритет (`medical-pregnancy-caffeine-guidance`).

### Лекарства и индивидуальные состояния

EFSA прямо не оценивала caffeine вместе с medicines или у людей с disease/medical condition; FDA указывает, что medications и conditions могут менять sensitivity. Поэтому досье не создаёт универсальный список «пуэр противопоказан с X». При беременности, заболевании, выраженных symptoms или регулярной лекарственной терапии следует показать врачу/фармацевту продукт, состав и фактическое употребление и спросить о caffeine/tea compatibility (`medical-interactions-individualize`). Самостоятельно отменять, переносить или менять лечение нельзя (`medical-tea-not-treatment`).

### Пищевая гигиена, плесень и хранение

Обновлённый корпус включает 120 post-fermented teas (60 пуэров), 219 китайских чаёв разных категорий, меньшие целевые выборки, spiked-matrix transfer experiment и прямое измерение конкретных коммерческих продуктов и настоев. Эти работы отвечают на разные вопросы: prevalence, один analyte, перенос или modeled exposure. Dry leaf, brewed infusion и фактическая доза не взаимозаменяемы; `not detected` выше LOD/LOQ и низкая расчётная региональная экспозиция не гарантируют другую партию или всю категорию (`medical-mycotoxin-evidence-limited`).

Для дома применимы консервативные признаки: хранить чай чисто и сухо, защищать от намокания, света, вредителей, чужих запахов и повреждения упаковки; warehouse limits ≤25 °C и ≤70% RH из DB5308/T 53—2020 не выдавать за универсальную формулу идеального домашнего старения. Продукт с видимой плесенью/пушистым налётом, затхлым или чужим запахом, следами воды либо повреждённой упаковкой не пробовать и не употреблять; сомнительную партию изолировать от остального чая и следовать local food-safety/retailer advice (`medical-food-storage-safety`).

### Почему нет «безопасных N чашек»

Без измеренного caffeine content, размера и режима заваривания, total intake из других источников и контекста конкретного человека универсальное число чашек было бы выдумкой. Официальные mg limits нельзя механически переводить в cups (`medical-no-universal-cup-limit`).

## Обязательные вердикты для формулировок книги и сайта

| Site-style формулировка | Вердикт | Допустимая редакция и абсолютное ограничение |
| --- | --- | --- |
| «Состав изучен лучше, чем клинический эффект» / better, not stronger | **Оставить с оговоркой** | `Лучше изучен` относится к объёму химических/лабораторных данных, не означает `медицински сильнее` и не доказывает efficacy (`medical-chemistry-not-clinical-efficacy`). |
| «Кофеин даёт бодрость» | **Оставить с оговоркой** | Это общий stimulant effect кофеина; response индивидуален, а 100 мг близко ко сну уже может нарушать sleep у некоторых взрослых. Не обещать продуктивность или пользу каждому (`medical-caffeine-alertness-sleep`). |
| «Пуэр улучшает кишечник/микробиом» | **Не утверждать как human benefit** | Допустимо различать Type D animal/in vitro/mechanistic hypotheses и Type C малые human pilot/pre-post studies специальных продуктов; clinical gut outcome у людей не установлен (`medical-microbiome-preclinical`). |
| «Полезен для сердца/метаболизма/веса» | **Сузить до данных специальных продуктов** | Допустимо: `малые краткие studies экстрактов и коммерческого шу сообщали surrogate changes`; неконтролируемое pre/post сравнение и множественные показатели не доказывают ни эффект обычного настоя, ни cardiovascular events, ни устойчивое похудение (`medical-weight-extract-evidence`; `medical-lipid-extract-evidence`). |
| «Мощный антиоксидант» | **Отклонить как health outcome** | Допустимо описать chemical assay; free-radical-scavenging result не равен предотвращению cancer, aging или cardiovascular disease (`medical-antioxidant-assays-not-outcomes`). |
| `能治百病` / «лечит сто болезней» | **Только attributed history** | Цитировать как представление Чжао Сюэмина эпохи Цин о пуэрской пасте; не превращать в современную рекомендацию (`medical-historical-hundred-illnesses`). |
| «Пуэр detoxifies / лечит / заменяет лекарства / предотвращает рак» | **Отклонить** | В проверенном human corpus нет соответствующих clinical outcomes; чай не заменяет диагностику и лечение (`medical-disease-claims-rejected`; `medical-tea-not-treatment`). |
| «До N чашек безопасно всем» | **Отклонить** | Считать total caffeine в mg из всех источников и учитывать человека; unmeasured cups не являются dose (`medical-no-universal-cup-limit`). |

## Аудит реестра источников

Общий и медицинский счётчики вычисляются валидатором из `sources.json` и `claims.json`, а не поддерживаются вручную как постоянные числа. Все источники, связанные с медицинскими claims, имеют `checked`; внешних медицинских одобрений — 0. NCT06401161 сохранён как `trial-registration/supporting`; NCT03613688 и UMIN000053941 имеют ту же классификацию. Они описывают планы, но без опубликованных результатов не входят в evidence of efficacy. Peer-reviewed human studies и три pu-erh-specific reviews остаются ограниченными по форме, дизайну или применимости. Слабые blogs и popular summaries не используются как medical evidence.

`siteVisible: false` сохранён для subscription-only Fujita 2008 (две записи), Kubota 2011, Xie 2012 и для NCT06401161, чья карточка не давала стабильной публичной выдачи. Новые публичные journal/registry pages видимы на сайте. Публичная abstract page не означает полный текст; DOI/pages добавлены только при подтверждении, а `null` не заполнялся догадкой.

## Ограничения доступа и рецензии

- Для части старых human records проверка ограничена abstracts и metadata; неизвестные dose/n/attrition/adverse-event/funding/registration поля не реконструированы. OA/расширенный текст новых работ не отменяет их design limitations. Numerical effects не считывались приблизительно с figures.
- Supporting PDF Xie et al. был недоступен из-за WAF challenge; n, dose и preparation не реконструированы. Классификация `brewed beverage` остаётся provisional по abstract wording.
- CNKI search endpoint не прошёл TLS hostname validation; использован доступный Wanfang Medical. Crossref fuzzy `query.title` count не интерпретируется как corpus size.
- Не выполнялась оценка персонального риска, взаимодействий или конкретной партии; региональные/modelled mycotoxin estimates не являются exposure assessment домашнего настоя конкретного читателя.

Внешний лицензированный врач или clinical pharmacologist: **`pending`**. Реального medical reviewer нет и его имя/credentials не создавались. Все 18 medical reviews в `reviews.json` — `pending` с qualification `internal evidence audit; not a licensed clinician`; все формулировки остаются editorial draft, а claims — `checked`/`rejected`, никогда `verified`, до независимой medical review.
