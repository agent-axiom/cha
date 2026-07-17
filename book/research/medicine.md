# Пуэр и здоровье: редакционное медицинское досье

Дата поиска и внутренней проверки: 17 июля 2026 года.

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

PubMed ESearch вернул 95 записей по human/clinical строке. Все 95 заголовков и доступные abstracts просмотрены: 7 записей прошли в evidence set — 6 человеческих исследований пуэра и 1 непосредственно пуэр-специфичный systematic review; 88 исключены как животные/клетки/химия/производство, общие чайные работы без отдельного результата пуэра либо нерелевантные совпадения. Отдельная review-строка PubMed дала 1 запись, уже входившую в эти 95. Citation chasing из full text этого review выявил ещё один pu-erh-specific systematic review/meta-analysis (`lin-2019-meta`); его точная DOI-запись Crossref проверена отдельно. Wanfang Medical показал 103 результата по широкому запросу `普洱茶 临床`; просмотрены 10 заголовков/фрагментов первой страницы, новых включений не было. Crossref вернул 61 862 fuzzy matches по `query.title`; из-за отсутствия строгого phrase matching эти записи не использовались для количественного вывода и не проходили screening.

Дедупликация выполнялась по DOI или PMID, затем по нормализованной паре «точное название + первый автор + год». Результаты разных баз не складывались. После title/abstract screening проверялись тип продукта, человеческая выборка, comparator и доступность исходных чисел. Полный OA-текст был доступен для Jensen et al. и Yang et al.; Europe PMC пометил пять остальных human records как `Subscription required`, поэтому для них использованы PubMed abstracts и библиографические metadata. ACS supporting PDF Xie et al. вернул WAF challenge; недоступные поля не реконструировались.

WHO, EFSA, FDA и SAMR не показали стабильного счётчика результатов для сохранённых site queries; поэтому в CSV стоит `not reported`, а `screened_count` отражает только фактически открытые официальные страницы. CNKI search endpoint имел проблему TLS certificate/hostname; вместо него использован доступный институциональный Wanfang Medical с опубликованным счётчиком 103.

## Шкала доказательств

- `medical-a` — применимая актуальная официальная рекомендация;
- `medical-b` — непосредственно применимый systematic review/meta-analysis;
- `medical-c` — человеческое интервенционное или наблюдательное исследование;
- `medical-d` — животный, клеточный, химический или microbiome-механизм;
- `medical-e` — традиционное историческое представление.

В registry после внутреннего аудита: `medical-a` — 6 claims, `medical-b` — 1, `medical-c` — 6, `medical-d` — 4, `medical-e` — 1. Всего 18 medical claims: 17 `checked`, 1 `rejected`, 0 `verified`. Уровень обозначает тип лучшего применимого evidence, а не величину эффекта; abstract language и statistical significance не повышают уровень.

## Человеческие исследования

Ни одна из найденных работ не является испытанием эффективности обычного домашнего настоя как напитка. Пять клинических efficacy/safety records изучали водорастворимый или концентрированный экстракт, часто в таблетках/капсулах; Xie et al. изучали метаболическую судьбу компонентов после ежедневного употребления пуэра, а не лечение или клинический исход.

Обязательная классификация intervention type: `fujita-2008-safety` — **water extract**; `fujita-2008-trial` — **water extract**; `kubota-2011` — **water extract** в barley-tea vehicle; `chu-2011` — **concentrated extract** capsules; `jensen-2016` — **concentrated extract** powder, растворённый в воде. `xie-2012` предварительно отнесён к **brewed beverage** только потому, что abstract говорит `daily Pu-erh tea ingestion`; preparation и dose не сообщены, поэтому эта классификация не поддерживает dose equivalence. **Isolated-compound** или достоверно **mixed-intervention** human studies в включённом корпусе не найдены.

| Source ID | Вмешательство | Доза и длительность | n: randomized / enrolled / analyzed | Comparator | Заранее заданный / главный outcome | Attrition | Adverse events | Funding / registration | Дизайн и риск смещения |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `fujita-2008-safety` | Водный экстракт Pu-Ehr, таблетки; концентрированный экстракт, не обычный чай | Test 2: 0,75 или 1 г/день, 8 недель; test 3: 10 г однократно; test 4: 5 г/день, 5 недель; test 5: 1 г/день, 4 месяца | randomized: not reported in accessible text; enrolled: 20 / 10 / 11 / 21 по четырём human tests; analyzed: not reported in accessible text | Comparator/control details: not reported in accessible abstract | Primary outcome not identified as prespecified; safety labs, затем TC/LDL и масса тела | not reported in accessible text | Abstract сообщает отсутствие изменений выбранных hematology/biochemistry safety parameters; клинические adverse events отдельно not reported | Funding: not reported in accessible text; registration: not reported in accessible text | Несколько малых dose/safety studies и неконтролируемый 21-person efficacy test; выборочные surrogate endpoints, не клинические события |
| `fujita-2008-trial` | Водорастворимый Pu-Ehr extract в таблетках | 333 мг 3 раза/день перед едой (999 мг/день), 3 месяца | randomized: 47; enrolled: 47; analyzed: not reported in accessible text | Placebo tablets | Prespecified primary outcome not identified; TC/LDL, triglycerides, масса тела и safety biochemistry | not reported in accessible text | Abstract: жалоб на adverse effects, включая abdominal distension, не было; иные способы сбора AEs not reported | Funding: not reported in accessible text; registration: not reported in accessible text; оба автора аффилированы с Nippon Supplement, что не доказывает источник финансирования | Double-blind randomized group comparison; малый n, неизвестная attrition/registration, несколько surrogate endpoints |
| `kubota-2011` | Водный экстракт Pu-Erh в порошковом ячменном чае | 333 мг перед каждым из 3 приёмов пищи (999 мг/день), 12 недель + 4 недели follow-up | randomized: 36; enrolled: 36; analyzed: not reported in accessible text | Тот же порошковый ячменный чай без экстракта | Prespecified primary outcome not identified; масса/BMI/талия и CT visceral-fat area | not reported in accessible text | Abstract: участники BTE не жаловались на adverse effects such as abdominal distension; measured biochemistry без значимых различий | Funding: not reported in accessible text; registration: not reported in accessible text | Double-blind randomized placebo-controlled; малый n, неизвестная attrition, множественные surrogate endpoints |
| `chu-2011` | Pu'er tea extract в капсулах; концентрированный экстракт | Доза not reported in accessible abstract; 3 месяца | randomized: 90; enrolled: 90; analyzed: not reported in accessible text | Placebo capsules | Prespecified primary outcome не указан; BMI/waist-hip, glucose, lipids, inflammatory/oxidation markers | not reported in accessible text | not reported in accessible text | Funding: not reported in accessible text; registration: not reported in accessible text | Randomized double-blind placebo-controlled; abstract не даёт дозы, attrition, численных group effects или анализа multiplicity; высокий риск selective reporting/неясность |
| `xie-2012` | Ежедневное употребление пуэра; точная форма заваривания и доза not reported in accessible abstract | 2 недели baseline + 2 недели intake + 2 недели wash-out | randomized: not applicable; enrolled/analyzed: not reported in accessible text | Внутриличностные baseline/wash-out периоды | Metabonomic profile мочи и метаболическая судьба полифенолов; не клинический outcome | not reported in accessible text | not reported in accessible text | Funding: not reported in accessible abstract; registration: not reported in accessible text | Одногрупповое serial-sampling mechanistic human study; supporting PDF был заблокирован WAF, поэтому n/доза не восстановлены |
| `jensen-2016` | Puer tea extract powder, растворяемый в воде; концентрированный экстракт | 3 г/день (2 × 1,5 г), 20 недель | randomized: 59; enrolled: 59; completed: 49; analyzed: 48 после post-randomization исключения одного completer | Dextrin placebo powder | Prespecified primary outcome not identified; weight/body composition/lipids, glucose, CRP | 10/59 не завершили; ещё 1 completer исключён из анализа | 4 placebo и 1 PTE прекратили участие по разным медицинским причинам, включая смену medication/health status; причинная связь с продуктом не установлена, systematic AE collection не описан | Sponsor: Tasly Pharmaceuticals USA; 3/5 authors были сотрудниками sponsor; registration identifier not reported in full text | Randomized double-blind placebo-controlled; 18,6% не вошли в analysis, post-randomization exclusion, малый n, multiple endpoints и sponsor involvement |

Абсолютные эффекты из abstract/full text не переносятся между endpoint definitions. Jensen et al. сообщает среднее снижение массы внутри PTE group примерно на 1 кг и significant междугрупповую разницу BMI на 20-й неделе, но численный absolute between-group contrast для массы/BMI в тексте не дан; total/regional fat, cholesterol, HDL и LDL между группами значимо не различались, triglycerides дали лишь trend. Для остальных abstracts отсутствие полноценной численной between-group таблицы означает, что magnitude остаётся `not reported in accessible text`.

## Редакционные выводы об эффективности

Найдены два pu-erh-specific systematic reviews, но ни один не является обзором clinical efficacy у людей. Yang et al. включил heterogeneous enzyme assays, in vitro и mouse evidence; Lin et al. meta-analyzed только две mouse studies (16 records). Их уровень `medical-b` обозначает systematic-review design, но неприменимость к human clinical outcomes остаётся абсолютным ограничением (`medical-enzyme-review-not-clinical`).

**Вес и body composition.** Fujita, Kubota, Chu и Jensen сообщали изменения отдельных endpoints после экстрактов. Это пять малых/коротких clinical records, если считать многочастное Fujita safety/efficacy paper отдельно от RCT. Наиболее доступный full text, Jensen et al., имел 59 randomized, 48 analyzed, sponsor involvement, около 1 кг среднего снижения внутри PTE group и значимую междугрупповую разницу BMI без опубликованного численного absolute contrast; междугрупповые total/regional fat differences не были значимыми. Этого недостаточно для фразы, что обычный пуэр «вызывает похудение», и устойчивый clinical benefit не установлен (`medical-weight-extract-evidence`).

**Липиды и cardiovascular claims.** В исследованиях измерялись cholesterol fractions и triglycerides — surrogate endpoints, не инфаркт, инсульт, cardiovascular mortality или medication reduction. У Jensen et al. cholesterol, HDL и LDL не различались между группами, а triglycerides дали trend; положительные within-group изменения нельзя выдавать за placebo-controlled effect. Нельзя утверждать cardiovascular prevention или замену lipid-lowering therapy (`medical-lipid-extract-evidence`).

**Гликемия.** Chu abstract сообщает множество glucose/metabolic changes, но не даёт dose, attrition или численные between-group effects; Jensen не нашёл significant between-group fasting-glucose effect. Два systematic reviews об enzyme inhibition/mouse glucose не закрывают этот clinical gap. Evidence недостаточно и непоследовательно; пуэр не является средством лечения или профилактики диабета (`medical-glycaemia-inconclusive`).

**Самый сильный безопасный вывод.** Небольшие исследования концентрированных/водных экстрактов дают hypothesis-generating сигналы для некоторых anthropometric и metabolic surrogate endpoints. Они не доказывают clinically important benefit обычного настоя и не поддерживают disease-treatment, detox, cancer-prevention или medicine-replacement claims (`medical-human-efficacy-is-extract-evidence`; `medical-disease-claims-rejected`).

## Безопасность и применимые рекомендации

### Кофеин, бодрость и сон

Пуэр содержит кофеин, но содержание конкретной порции зависит от листа, партии, массы, температуры, времени, числа проливов и объёма. EFSA указывает для **здоровых взрослых** отсутствие safety concern при single dose до 200 мг и total intake до 400 мг/день из всех источников; FDA также cites 400 мг/день для большинства взрослых, подчёркивая широкую variability чувствительности и скорости выведения. Это не target, не гарантия для каждого и не число чашек пуэра.

Кофеин может повысить бодрость и уменьшить сонливость; это не уникальное лечебное свойство пуэра. По EFSA, уже 100 мг single dose у некоторых взрослых может влиять на длительность и pattern сна, особенно близко ко времени сна. Практический вывод — учитывать timing и собственную реакцию; при insomnia, palpitations, anxiety, tremor или GI discomfort уменьшать exposure и обсуждать симптомы с healthcare professional (`medical-caffeine-alertness-sleep`).

### Беременность и лактация

Два официальных ориентира нельзя сливать. WHO eLENA (global, context-specific) рекомендует беременным с **высоким intake свыше 300 мг/день** снижать ежедневный кофеин для уменьшения риска pregnancy loss и low-birth-weight neonates. EFSA (EU risk assessment) считает intake **до 200 мг/день из всех источников** не вызывающим safety concern для плода; та же страница относит этот уровень к pregnant/lactating women. Оба числа относятся к **сумме** чая, кофе, cola/energy drinks, chocolate, supplements и medicines, а не к чашкам пуэра. Local obstetric guidance и индивидуальная рекомендация clinician имеют приоритет (`medical-pregnancy-caffeine-guidance`).

### Лекарства и индивидуальные состояния

EFSA прямо не оценивала caffeine вместе с medicines или у людей с disease/medical condition; FDA указывает, что medications и conditions могут менять sensitivity. Поэтому досье не создаёт универсальный список «пуэр противопоказан с X». При беременности, comorbidity, выраженных symptoms или приёме препаратов с narrow therapeutic index следует показать врачу/фармацевту продукт, состав и фактическое употребление и спросить о caffeine/tea compatibility (`medical-interactions-individualize`). Чай не заменяет диагностику или назначенное лечение (`medical-tea-not-treatment`).

### Пищевая гигиена, плесень и хранение

Task 5 dossier показывает неодинаковые результаты небольших выборок и target panels: dry leaf, brewed infusion и фактическая exposure не взаимозаменяемы. ДНК потенциального продуцента не равна toxin; `not detected` выше LOD/LOQ не означает нулевой риск или безопасность другой партии. Поэтому нельзя писать ни «в пуэре всегда есть микотоксины», ни «пуэр как категория доказанно безопасен» (`medical-mycotoxin-evidence-limited`).

Для дома применимы консервативные признаки: хранить чай чисто и сухо, защищать от намокания, света, вредителей, чужих запахов и повреждения упаковки; warehouse limits ≤25 °C и ≤70% RH из DB5308/T 53—2020 не выдавать за универсальную формулу идеального домашнего старения. Продукт с видимой плесенью/пушистым налётом, затхлым или чужим запахом, следами воды либо повреждённой упаковкой не пробовать и не употреблять; сомнительную партию изолировать от остального чая и следовать local food-safety/retailer advice (`medical-food-storage-safety`).

### Почему нет «безопасных N чашек»

Без измеренного caffeine content, размера и режима заваривания, total intake из других источников и контекста конкретного человека универсальное число чашек было бы выдумкой. Официальные mg limits нельзя механически переводить в cups (`medical-no-universal-cup-limit`).

## Обязательные вердикты для формулировок книги и сайта

| Site-style формулировка | Вердикт | Допустимая редакция и абсолютное ограничение |
| --- | --- | --- |
| «Состав изучен лучше, чем клинический эффект» / better, not stronger | **Оставить с оговоркой** | `Лучше изучен` относится к объёму химических/лабораторных данных, не означает `медицински сильнее` и не доказывает efficacy (`medical-chemistry-not-clinical-efficacy`). |
| «Кофеин даёт бодрость» | **Оставить с оговоркой** | Это общий stimulant effect кофеина; response индивидуален, а 100 мг близко ко сну уже может нарушать sleep у некоторых взрослых. Не обещать продуктивность или пользу каждому (`medical-caffeine-alertness-sleep`). |
| «Пуэр улучшает кишечник/микробиом» | **Не утверждать как human benefit** | Допустимо: `animal, in vitro и mechanistic studies формируют гипотезы`; clinical gut outcome у людей не установлен (`medical-microbiome-preclinical`). |
| «Полезен для сердца/метаболизма/веса» | **Сузить до extract evidence** | Допустимо: `малые краткие studies экстрактов сообщали surrogate changes`; ни обычный настой, ни cardiovascular events, ни устойчивое похудение не доказаны (`medical-weight-extract-evidence`; `medical-lipid-extract-evidence`). |
| «Мощный антиоксидант» | **Отклонить как health outcome** | Допустимо описать chemical assay; free-radical-scavenging result не равен предотвращению cancer, aging или cardiovascular disease (`medical-antioxidant-assays-not-outcomes`). |
| `能治百病` / «лечит сто болезней» | **Только attributed history** | Цитировать как представление Чжао Сюэмина эпохи Цин о пуэрской пасте; не превращать в современную рекомендацию (`medical-historical-hundred-illnesses`). |
| «Пуэр detoxifies / лечит / заменяет лекарства / предотвращает рак» | **Отклонить** | В проверенном human corpus нет соответствующих clinical outcomes; чай не заменяет диагностику и лечение (`medical-disease-claims-rejected`; `medical-tea-not-treatment`). |
| «До N чашек безопасно всем» | **Отклонить** | Считать total caffeine в mg из всех источников и учитывать человека; unmeasured cups не являются dose (`medical-no-universal-cup-limit`). |

## Аудит реестра источников

Общий `sources.json` содержит 44 записи; 20 уникальных source IDs используются medical claims. Все 20 имеют `checked`. Текущие official sources WHO, EFSA, FDA и SAMR сохранены как core/guidance; peer-reviewed human studies и два pu-erh-specific reviews — supporting, потому что их applicability ограничена extract/nonhuman design. Слабые blogs и popular summaries не используются как core medical evidence.

`siteVisible: false` установлен для subscription-only Fujita 2008 (две записи), Kubota 2011 и Xie 2012, где полный текст не был доступен для проверки. Jensen и Chu сохраняют публичные PubMed/OA links, а Yang, Lin и FDA подходят для публичного показа. DOI/pages добавлены только когда они были подтверждены PubMed/full text/Crossref; `null` не заполнялся догадкой.

## Ограничения доступа и рецензии

- Пять из шести human records Europe PMC пометил `Subscription required`; их dose/n/attrition/adverse-event/funding/registration поля заполнены только в пределах PubMed abstracts. OA full text доступен для Jensen et al.; numerical between-group weight/BMI contrast не напечатан в тексте и не считывался приблизительно с figure.
- Supporting PDF Xie et al. был недоступен из-за WAF challenge; n, dose и preparation не реконструированы. Классификация `brewed beverage` остаётся provisional по abstract wording.
- CNKI search endpoint не прошёл TLS hostname validation; использован доступный Wanfang Medical. Crossref fuzzy `query.title` count не интерпретируется как corpus size.
- Не выполнялась оценка персонального риска, взаимодействий или конкретной партии; mycotoxin data Task 5 не является exposure assessment домашнего настоя.

Внешний лицензированный врач или clinical pharmacologist: **`pending`**. Реального medical reviewer нет и его имя/credentials не создавались. Все 18 medical reviews в `reviews.json` — `pending` с qualification `internal evidence audit; not a licensed clinician`; все формулировки остаются editorial draft, а claims — `checked`/`rejected`, никогда `verified`, до независимой medical review.
