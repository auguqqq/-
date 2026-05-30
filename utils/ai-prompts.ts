
/**
 * Inkflow Studio v2.0.0 - AI Prompt Corpus
 * 
 * 此文件集中管理所有 AI 交互的 System Prompts 和 User Prompts。
 * 针对中文网文创作环境进行了深度优化，整合了雪花写作法、斯奈德节拍及各大主流网文流派的创作心法。
 */

import { Book } from "../types";

// ============================================================================
// 1. 智能捉虫 (AI Proofreading) - 记忆增强版 (Phase 2)
// ============================================================================

const d = (s: string) => { try { return typeof atob === 'function' ? decodeURIComponent(escape(atob(s.split('').reverse().join('')))) : s; } catch(e) { return s; } };

const PROMPTS = {
  PROOFREAD_BASE: "=IIgj34hpXKukbbhlHonmjKlnf7tmL5porYjlL5pojahlXIgobJimzIvvrYjlDIuknInmr6jlf7jl3Iklbauk/ytPWOrLa+L3+Y5Vyb5ay77qoivamuvBeeuCe+hgauKqAiLzoggAOejPWOubeOqFWOjuWek+i+uAm+kwi+u4SulIaOj8+ugHaej4S+uviOqFWOjuWOtHiOvvWuu8e+iuauhIWOkIaOktWepPWum8+uKqU4ln36rofKgmHpvovLgpriKg4iMKIIgjnIvv3oonzpmpv7roXImpT7hoz7rljKlnf7tm34hpXKuk3JgifpvlDLnlTomnzJgiLopljIvv/6ronJlpL4poLqrl/KmmvbopX4vlrJvvriKX2a5riY5ZSZ6kyL5sG65qoCIuEjCay77RC44pQ3cpxWZ0lGaXhCI1aY5FOo5Eq55ZSZ6lqo546K6BWY5FuL5QC44KoggAOeica+nUeer4SOoXaegmiej4SugAOenAK+tveup0iOnAK+rYa+hWa+nOWOtviegmiej4SOj8+enAK+tveOk4WOnAK+rYa+hWa+nOWOneaugmWugAOuKqgKnljZrl7prl/Jnn3KukzKnmfolmjKnl3Jgifolm/pjlzJgiTomnr7hlfIjmDavk35vk7aonvbopX4vlriKay77qoSmUmOo6eeini+u5WuotaegmeuKqAiL1oggAOenAK+h/iOnAKegAOenAKOgdeOnAKegAOenAKuh6SOnAKegAOenAKOhaeOnAKOoIWuniW+jEa+jamegmiej4Sum8+uKqQblmPIso34rorZmoLarmHopnriKg4CNKIIgjHqrnHopo3IuknJilbKklzIvvjIkl36lprKnmf7jlz6im/ytPWel8W+rYaundmOpZmugAOOvgaujjmOhaeehAiOn9S+rYaem/iOj8+uKq0JgizJgif7jlXJvlz4jlrLuk3IgjzIgjf7jlXJvlL5poT7mnnLlm76vkHopnXKukriKay77qoCvgaujjmeuCe+hga+k7eOo6euotaegmeuKqAiLzoggAOepPWOs/iOiZmuu4S+otaur/SepPWehjiukAWuiKaegmiej4SOj8+erviuodmup5SOkIaeuUaervi+oPWuiKaegmiej4Sum8+uKqQJsm36roj5jlnLlmLarmHopnriKg4iMKIIgjLajmvrjlHLslfqunj5qp3IukfYsm34rofpvln4poHopo3IukzIvvnLlmvrjlHLslb6llDbllDZrlX6jlfpvln4poHopo3IukrJvvriKymI6mar5i2q5Ba65qoCIuEjCay77RC44p4WZkRWaiJ3bGhCIi2q5Ba655+a5du75QC44KoQnAKugAOeuUaej4SeuvWen7eeswWOj8+umAm+l+W+uvienviepPWOg4SOneaugmWOnAKum8++rYaerTm+sPW+p6WOhaeOo9SugAOemUmOo6eOhaeekAOup6WOkZmuj9SOgcaOkAOOjhi+m/i+rYaeoKW+u7SOhaeOo9SuCCC44YGZ5AOq5oSL65+a5hCq5Im456eY5Hap5tiL5Eq55buI6liL5BC443WY63aY5qiL5AiL5vip5g2L5",
  PROOFREAD_OUTPUT: "=0lC9BCIKIybwlHdiAiOiUGc5RnIgACIgoALikIvvHLplrLvnnrgnfIomHIgjfZrlvKilnJlprJvvLopljIvvvonlvbsn/6ronJlpr7hlfIjm36nnDornLCI6IibvNXYlJnIgACIgoALiUrrmfYin7IklnLlm76vkLCI6IibvlGdzV2ZnV3ciACIgAiCsISi8+euCe+hgaOrLaehMWOj8+OtHiOg4SOqFWOjuW+hWa+nOWuj4S+uhmeh/WOi8+etua+hJe+hWa+nOWuIgojIsFmbpdWay9mIgACIgowegAiCbpgm8+Osui+hgaOIud3bktmch1EIgep5My77Eu75wWp5g40TTpEIvq75KoJvvHJgj/IvlzLom75mlT5voDJgjrgCCC44DCI6C+Y5b6L5FuL5u6K66ub5Eq55g2L5CC446qL57iL5Eq55BOZ5c2L5vip5Nmo5FCI6c2L5My77P2L5w6K63+K6KoJvvHJgj7ImmD7olPKto3YhlDJgjrgCCC44qoiruiuu7Wepvi+g8WuvUa+tviuKqwIvvfLomDIuk3Jgm/IhmX6jl/pjlzoklDZrlX6jlTomn7IklnLlm76vkzpnmLoplrJvvX6nmD4omvbopX4vl/ZukzIvv7qror7ulnInm/bvkPbjlDSLKIIgjnIvv3JgiboukHbsl3LkoPLmprKplzJgiDJimnLlmHopo3Iuk3JgibInlX6lm3LkoPrsm/blpzJgiLopljIvvriK+6L6oGK6Eq55p2b5ymI6m2a5Hap5Jyp53WY55Sp5u+L5Ba65liL5qoCItoggAOuKq04ro3IklnInmPJukHIgj3IklDLnlHIgj3IklrruknLlm76vkHopnXKukriKg0iCBy77wWp5ReY5MGK66yb5BaK6NiL5CC44qoSXbBCh7eOsVauupeunbWOl/iepOaOtbe+uhmeh/WOj8++rviemUmejHmep4SOhaeehGWekAOelNWejQWevZeOs/iui4SOkAOOsOeekPWeicaeoyaOneaugmWuKqASLKIIgjT4unDblmDiTPNlSg45mlT5vozIvv/6ronJlpDrjnH5jlzpnmLoplDSLKoJvvHJgjnJilT4por7hlPpvoDJgjrgC",
  DEEP_CRITIQUE_BASE: "fy77iWo5H+L6PWa5CqI6mCZ5vip5fy77Q2a5pKZ6GqL56eY5bqo5xCb5H+65Ayb5oyZ5mCZ5vip5ay77Jy77H+65Ayb55+a5IKZ6Iy77qoSmIW+nOWOoreei4SekHmOh7muKqAiL1oggAOOrhe+nUeOmKaOr9iugKiehDaehAiulIaOj8+uvuiuu6SOiQWupseej4Suu4SOjhieqJeuu6Sum8+uKqI4oo3qlmHpvovLgpriKg4CNKIIgjD7von5jlrKmnLbul34pnn5vo3Jgiboukn4poHannb5ukzIvvbouk3appPIklb5ukzJgi/Kmm/4glzIvvnphl/4jmLoiob4un/YukrLvnrJvvriKmSL60Cr5BWr5qoCIuMjCCC4426p51CZ5MCI626p51CZ5GqL56iL5FCI6Wio5My77syp5nmY51+b5oyZ5vip5POY5My77N+K6w+Y5c2L5PmL56y75d+K65+a5pm456qL5ay77qoSgqeusGWuq8SuKqAiLyoggAOei8++ZulGctVHZt8mZulEi8+OjgeuhgWumuWuvuiugniOjVeul4SegAOej7e+i7S+rZaOjDiOhaeepHe+reaetua+pkWum8+uKqcolm7ImmT7roriKg4SMKoJvvHJgjjpop76lpvIukX6uk/4jmvaimnrgn34hpf7roDJgjrgCCC4491XZy5WZHJWdzt3eay77Q2p5YKa6BOZ5c2L5NmY5T2b5KIIgjriKdCo4kyL5sG65Eq55KiL5VOr5ZaY5cCo4qoiuHW+hMa+rYaOjAiOj8++ltW+qIWemUmeuUa+rYaej4S+hgaurbeOhaeOo9SuCCC44RC44oOr55mo5u+L5+K75QC44MGK6b+L6oyZ5j2q5My77Wy757iL5Hap5R275Eq55xer5EWL6N2L5AiL5vip5g2L5",
  DEEP_CRITIQUE_OUTPUT: "dpQfgAiCiwWYjlGdpJ3YiAilIaOIv8CIicmbp5mchdnIgojIsVmdlxmIgACIgoALiIIgjPIjorLpnnphlnLlmvKklXIjlzIvv7qror7ulnLlm76vkTomnPZvkfbhlLCI6ISZjlmdkFmIgACIgoALikIvv/JhmLanpvLln/YukrLvnHIgjPpsmb5im/YplLoioHIgj7atmzqgm35ron7rlHIgjnZvkfphl/ammz4gorJvvLopljIvv7brnfIomDyj4++tP+J8iAiOicWY0JCIgACIKwiIJy77v+Y5z2Y5X2a5wITLwETl9WOmRaOi8+etua+hJe+k9S+tFWOhaeOmimurXmeicaer4S+hWa+nOWuIgojIlR3b1FnIgACIgowegAiCbpgm8+envi+n6Wegmeep4SOj8+ub39GZrJXYNBSgmeep4SOj8+Oh7eOsVaOIO90UKByr6euCay77RC44Pyb58Cq5euZ5U+L6QC44KoggAOeuUa+tgaem/iegmiOi5SOg7Suu4SuiHm+oniepdaei8+enAKuqea+i5S+qkW+gvieklWOnAKegAOenAKOs/iusuiundmOjAiuukeelxWOnAKugmWOi8++p3WOgKaOn9SemGWOhae+k9S+tFWOqUeel8W+tviOj8+OqUeugAmOneaugmWOj8+er4Setua+ltWOInU2YpZHZhdCIoyZ5ay77qoSkSa+rUauuuiuhQeuKqoggAO+gAiugPWepOaOtbeevDiehAiOn9S+SequiOj8+uKqMIjorLpnnphlnLlmTomnPZvkfbhlvpvkD5jmvbopX4vlriKKIIgj3Jgi7iLuIoplT5rmzIvvnphl/4jmn4pozKklXahlDqilX6uk/6jlz4hpn5vozJgiT7roHopozIvv3Jginphl/4jmrLvlDqilzJgiT7roHopo3IukDiKqEIvvPZvkfbhlvbopX4vl7qror7ulriKKIIgjfYinHajl7qror7ulnLlm76vkTomnPZvkfbhlDJim/JlnzIvvXrrmfYinTIplDSNtMDIEq55NeY6liL5Ayp5YKa6ueZ6tiL5Hap56eY5JCY6Ryo53+K6KoJvvHJgjLYsmHopo7hlPpvoDJgjrgC",
  SEARCH_NETWORK: "CC44Jy77wWp5C+Y5u2o5wWp5Eq55T2L53WY5BC449OI6MGI6Eq55MGI6Y6a5juL5k+Y5BC44VOr5aGY5Eq55pm45fOa6BC44oSL6Q2p5Eq55Nyp5jGK6ay77Caa5Iy77CqI6Gu75Eq55dCo4fSo5e6a5fy55cCo4MKZ5dCo4mqb5SK75XKa6cCo40+K6PCb5gqY5eKa59OI6bqL5jKY6oOr5zWY5ay77qoSuCeejHm+p+SuKqAiL1oggAOuKq4brnfIomDCTNRFSggKln/bvkLarmHopnriKMy77Jy77oGK6XiY5g0CIsoiK5K45NeY6XK75gqY5qoCICaa5Iy77Pyb58Cq5g42dvR2ayFWTggKln/bvkrJvvriKCGr5BaK6Im45S6o5qoCIuQjCCC44dCo4Hm45h2Y5Zap5EWL6cCo4Eq55wmp5Fir5E6p5Tu75Qio5GC550Wp5c6p5Tu75iS75cCp5GCb5g4yMKIIgjDpumXanm/agmH6vkj6smfIomDSXNCZ5Zu65R275bBCqUe+v9Sur9eej9S+k9WugAmer4S+hWa+otaOqcW+tvium8+uKqQIplr7hljKlnXJvlvbopX4vlriKg4iMKIIgj/agmH6vkTomn7aonb4hlDInmHIgjDrlmDInmb5jlfrjonIvvfmbpRmb19mcHBCajJXYlNFIlx2Zv92RIy77bqY59OI6R275UGI6Eq55g2L5oS55piY5g4SMKoJvvHJgjHqilv7ukDJgjrgCqoigAOOgoierviul7SutFWulIa+hWaesLiegAO+hWaOh/SOqUe+v9SuotaegmeuKqoAIqoigAOejkWunbWOIpU2cl5WaoNEIkVWamlGbw1WaThCIHap5tiL5T2L5A665oS55/2L59OI6q+Y5UiL57Ga6F+b5qoiCay77RC44L6b5BOZ6AiK6t+K6g0CIKGZ5m2K6NeY6liL5QC44KACIgAiCCC44CqI6Gu75pm45omZ5Wio5a6a5+6K6y+Y5G6Y5BC44Zap5EWL6vmp5MOI6Eq55a6a55m45i+K6l+p5BaK6AyZ6My770+K6PCb5ZaY5wKp5oyZ5j2q53io5oS55CC44Lmo5pqY5iS75AOq5Zap5EWL60+K6PCb5Eq55aiL5TiL5qiL5AiL5vip5g2L5",
  SEARCH_LOCAL: "=IIgjPIgoL4jlXqjmT7mnDZnmDKtnzZvknphlrLukzZvkjIklLIgpzIvvP4unLbulHIgjXqjmT7mnHopoTZrn75mlrJvvriK8Cq5OOa6qoCIuQjCCC44qoivte+hgaOIM1EVIBCqUe+v9SuotaegmeuKqwIvvnIvvjaoofJilDSLgwiKqkrgn34hpfpsnDqilriKgIopljIvv/IvlzLomDib39GZrJXYNBCqUe+v9Sum8+uKqIYsmHopojYinLpjmriKg4yMKIIgj7Immj6sm3KukfolmjKnlX4vlHqilf7rozIvvnIvvnYrnvIgj76mnLrunnYjozKnmrIgjHIgjvIgjDrroL7jlrIgjLopljIvvTIplr7hlTomnnrgnb4roX6nnX6rofbtob4vl75ml37goDavkzpnmLoplDiKdCo4CC44k6K6uG65uy45Hap5zWY54u55FiZ6l+p5u6K66ub5My77GC550Wp5Tqb5G+K6l+55oOY6FaY5L6Z5hiq5OqL56+Z5Zap5EWL6KiL5luL5qwJgirJvv7Immj6sm7LslvKnmTZrn75mljKnlf7rozIvvHZvnTZgoX5smD6lm7oukHLlnrJvvriKOip50+K6oS55Vyb5qoCIuIjCCC44U265euZ5MGK6b+L6G+K6l+55Eq55tiL5u2o5wWp5Du75t6K6g2L5oS55DCL6g4SMKoJvvHJgjHqilv7ukDJgjrgCqoigAOOgoierviul7SutFWulIa+hWaesLiegAO+hWaOh/SOqUe+v9SuotaegmeuKqoAIqoigAOejkWunbWOIpU2cl5WaoNEIkVWamlGbw1WaThCIHap5tiL5T2L5A665oS55/2L59OI6q+Y5UiL57Ga6F+b5qoiCay77RC44L6b5BOZ6AiK6t+K6g0CIKGZ5m2K6NeY6liL5QC44KACIgAiCCC44Zap5EWL6i+K6l+p5Tqb5G+K6l+55Eq55oOY6FaY5g2L5oS55piY5BaK6AyZ6My770+K6PCb5ZaY5wKp5oyZ5j2q53io5oS55CC44mmL5oWY5Re65+m55rqL6PqZ6Eq55m2a5a2Y5qiL5AiL5vip5g2L5",
  EDITOR_BASE: "==gC913clVXcp5GajVGd7tnCay77Jy77DKa5t+K6ICZ5Tu75BaK6My77MC65GCa5sG65fS55BaK6NiL5Iy77oS55Q+L67Sr51G452ep5u6K66ub5Wio5E+K65K45oyZ53+K6My77neb5Aqo5c2L5ZaY5LiL5luL5l+55fa45g2L5KoJvvHJgjnyclVXcp5GajVGVgcmbpRXaydFKgMpulf6tlDoimzZvknphlDJgjrgCCC44XK75gqY556a5FaY55K45NeY6My776eY5T6L6Pyb58Cq5g42dvR2ayFWTggKln/bvkrJvv/IvlzLomDSLKIIgjHrilPJvp7oukTollHIgjfpomfolmHZvnL4hmHIgjnKilDoinHIgjrJukPJukrJvvzLom74opDSLKIIgjnSZzVmbph2QgQWZpZWasBXbpNFKgcolm3KukPZvkDornrJvvDIqo36roDSLKoJvvHJgj/ZnmbqunzKnmr7nlDJgjrgCqoigAOurNaOsVa+gFWulIauiHm+oniOhae+hWaer4Sundmel9S+u7SuuHW+k+iegmiej4SuKqoAIqoigAOerviulkWul7SutFWulIa+hWaesLiegAO+hWaOh/SOqUe+v9Segmeep4SuKqoAIqoigAOejkWunbWOIpU2cl5WaoNEIkVWamlGbw1WaThCIHap5tiL5T2L5A665oS55/2L59OI6q+Y5UiL57Ga6F+b5qoiCay77RC44L6b5BOZ6AiK6t+K6g0CIKGZ5m2K6NeY6liL5QC44KogKqIIgjParmDqunzosozLpnf7rozIvv3JgiTqrlzZvkX6tlTLsmjqolzJgiDLilD5jmfLimjKlnzpnmLoplLIgj3JgiHYtmjqolzJgibJim3JgiTqrlzZvkX6tlTLsmjqolzJgirLukH5rov7vnHopnXKukriKKoiKCC44dCo4vlGZ1R3Ugc3bsZ2aulEnAKulIaenAKuq6eOlseOnAKuu4SOsneejQWut7S+r9iuKqogm8+ekAO+i+WegTmOjJeegTWOItAiiRWuptiejHmep4SOkAOuCKIIgjbJvnPKto37gorbmmzYinvojnTomn3JginybpRWd0NFI39GbmtmbJhCIqq75Uy65cCo46iL5rqL6WyY53WL67iY5z2Y5g2L5",
  EDITOR_NOVEL_CONTEXT: "=IIgjfqunfYjlHoqnLrhlzoklzpnmD6mlb7ukvouk7ouk34hpfqvkzIvv3JgiLopmfpomX4gmfail/igKiOoreOnAK+rYa+uhmeh/Wum8+uKqwLom74opHopojZkmriKg0CIgACIgACIKIIgj/YplLoionrgn3LinHIgjbIknHqrn/JhmXovl/JnmHIgjHqro7rrofIjmvYimH5hpHIgjTJrn/Ivk/Jnm/blpHIgjnIvvvbrm/JlnrprlD6qnnIuk3YiljIvvD6qnnIukH5hpT4uprJvvj6smPbhlP4vljLomDSLgACIgACIgoggAO+hve+vVm+ltW+h4SuvZeegAOuteaui4SegAOup6euvteum8++hgaurbeOItACIgACIgAiCRC44pwWZ29mToASv9iun/i+hve+vVmum8++ieW+uxeegTWOn9SejJW+k9WOkAOuC",
  EDITOR_ANTHOLOGY_CONTEXT: "CC447eY55K45Vyb54CZ5MKZ51+b5sKo5gCY62iY5OqL5NeY6n6L5My77dCo4t+K68+a5b2554CZ5cCo4vip57Ga6F+b5ay77qoCvgaujjmegmiOmRauKqASLgACIgACIgoggAOOr9iejPWunleegAOekPWuhIeOvAW+t7Suq7eehDaegAOeK0BXZj52bDBCanlGSoU7vlLopmj5qpHIgjnIvvDZrlnqkpjIvvriKl+Y5JiL5NmY5ReY6Eub6qoim8+Oqza+sFW+g/WOugaOItACIgACIgAiCCC44GuZ6ICZ5H+65t+55BC44+yq5Gi453+Y5XyL5sWY5BC44JCY6Qu55OmL5l+55ay77HCq5uu55g0CIgACIgACIKEJgjnSen9GbvhGduFEKg4JtmHJho/ihbm+hWa+hveerfeum8++ieW+uxeegTWOn9SejJW+k9WOkAOuC",
  EDITOR_CRITIC_BASE: "=IIgj3Jgibqulb4rl/agmH6vkzJgizokl3JgiX6jlnIuk3YilH5hpT4upzJgiX6nmD4omnrgn34hpf7rozIvvf4rn36nnrLuk3qlmTKilzpnmLoplDCIgACIgogm8+ekAOOvvW+hMa+qIWeuJe+hWaun0aekEi+LH+65t+55QC44gACIgACIKoQKdCo4u4iLneb5Aqo5ZCo4qKZ5ry45RWp5YCo4oS55/2L5luL5v+Y5ESa5k2q5cCo4ay77Caa5L6L5My77u6K66ub5Eq55g2L5RKp5vSp5l2p566K6GC55T2L53WY5Eq55tiL5Tqb5neb5Aqo5c2L5ZaY5w+L6KiL5oS55Vyb5qoiruiuu7WOiDeuu8WuKqIIgjTJvmjqjmX4gmfailbJimHJklnrlmnLlm76vkTomnPZvkfbhlr7hln5unjCItACIgACIgogm8+uruiuu7WOIjMyIgACIgACIKoQKkyL5sG65R6L67CY6BC44Q2a5pKZ6PmL56y75BC44TKr5Wuo5PWa5CqI6Caa5My77YKa6ueZ6uSZ6zWY5qiL5gMTLyAiuHW+lIWOKg0CIgACIgAiCay775K456y75gMyIjACIgACIgogCpoLvl/JhmXahlP6ukHIgj76tl34jl7rrorrukLoplzIvvnrgn7qukrKukDiMtEDI6eY5XiY5oASLgACIgACIKoJvvnrgnjJvkDyIjMCIgACIgAiCKkIvvXZvkLopl/YplLoiozIvvrrukXJvljLklbKkl/KmmzIvvT4ronrgnHopoDornzYoov5vof4rnDIvln7rlz4hpn5vojIvvDCIgACIgogm8++hveOg8WOIjMyIgACIgACIKogm8+ei8++ldWegge+o7SOqUe+v9Segmiej4SOi8+uuHW+k+i+j8WOvgaOIud3bktmch1EILiL5luL5nW45Jyo58Cq5liL53+K6gACIgACIKoJvvHJgjLYsmHopo/IvlzLom3Ipl75mlDJgjDCIgACIgoAIgACIgAiCCC44RC44GeY5HCq5/i65H+L65K453WL6v8ZsmvYmm/ChMiuqVeOkAO+gAiugPW+tviugAOuhnieouWOjSWOmbeejkWup6Wes3aOjhi+m/i+rYaeoKW+u7SOhaeOo9SOIgACIgAiCRC44pcXZpZXZSByYpRXayNEKgYJvnvLukzIioL5rmrJvv/IvlHKqm3YilPZvlDJgjrgC",
  EDITOR_CRITIC_ANTHOLOGY_EXTRA: "==ggAOet/WOrCa+i4S+ifWegAOepOaOtbeegAO+o+i+m+i+uhmeh/WOj8+ei8+erviOvvW+sNWOi8+uKq0Jgi36roDZjojqjmjpimzavo7ZpnzJgiriK16q5AiL5Qio5fS55X2a5wAjMtADMxgKlnzIvvzLom74opTomnriKt+K6Q2I6o6o5U265euZ5eWL6Yua6vkIgpD5mn7YukX6nnriKnW45C+Y53+K6gACIgACIKACIgACIgoggAO+pDaOkBaulIa+hlWevlWegAOukAaOpEaOhaeehAi+uviOqKW+gwi+uhmeh/W+ltWOMwETjJWum8+uKqAZrlnqkpr6unX4gmriKg4yMgACIgACIKIIgj3KukvYukfLomLIvlbJimPoolD7mlXahlfbmpnainrruknqroXqjmT7mnzIvvPool/qjnzoklTJsmnKplvqnlr7kpHopo3IukrJvvriKBq65yaY5gCY62iY5qoCIuIDIgACIgAiCfy771+b5sKo5nSa5oeb5Wio5a6a5+6K6Eq55GC554ib5N+Y56eY5bqo57iY5Lu65mCZ5vip5ay77qoyuta+nUeumuWepPWOg4SOrseuKqAiLxACIgACIgogm8++hveOg8WepfaOgjaeuCeejHm+tviugAOenAKup6WuhvW+rBaeo/SOnAKOjSWenAKepPWei4SejJWekHmOh7mOnAKutpeusuiutFWegeaOtvi+jwW+hveerfeOIgACIgAiCay77RC44ZiY5VOr5ReY6Eub6H+65Ayb5g0CI8+a5Hyo5riY55m45Hap5eSr5RSI6vc4rn36nnDJgjrgC",
  EDITOR_CRITIC_LOGLINE_NOVEL: "Jy77E+K65K45Gu75m+K6Eq55g2L5Lea5Ayb5MGK6i2o53+K6My77OCZ5LmL5gUkTJx0RPxEi8+OIgACIgAiCgACIgACIK8yLvAigma+liaOhaeOkIa+nUeemGW+qhWOjHmem/iOI6UkTJx0RPx0Lv8CIgACIgAiCay77Jy77+265HCq55Sp5u+L5BaK6NiL5My77W+Y5Q+o5Pqb5Li65OqL5oS55Iy77qoyi4SugmWOvgaep4S+uhmeh/W+j8WOvgauKqASLgACIgACIKIIgjnrgnv5lnv7hlT7mnzIvvXYto/IhmDornDIqozIvvbLilfqjmzLomXKukrJvvriK2iY5QmZ6wWp5X2a5qoCItACIgACIgoggAOei8++sPWup3W+ltWOM1gIvvHJgjLopmfpomD6qnzKnmDJgjDStuaOg4SOkIa+nUeOj8+uKqs4plDIvlDInmTomn3Ipl75mljKnlX4vlHqilf7roriKgACIgACIKoJvvHJgjLopmfpomDJim/Jlnjqilr6hoDSLgQ6ukfIjmbLilrLvlDJgjrgC",
  EDITOR_CRITIC_LOGLINE_ANTHOLOGY: "Jy77E+K65K45Gu75m+K6Eq55g2L5Lea5Ayb5MGK6i2o53+K6My77OCZ5LmL5gUkTJx0RPxEi8+OIgACIgAiCgACIgACIK8yLvASrviOvvWOhaeOkIa+nUeemGW+qhWOjHmem/iOI6UkTJx0RPx0Lv8CIgACIgAiCay77Jy77+265HCq55Sp5u+L5BaK6NiL5My77W+Y5Q+o5Pqb5Li65OqL5oS55Iy77qoyi4SugmWOvgaep4S+uhmeh/W+j8WOvgauKqASLgACIgACIKIIgjnrgnv5lnv7hlT7mnzIvvXYto/IhmDornDIqozIvvbLilfqjmzLomXKukrJvvriK2iY5QmZ6wWp5X2a5qoCItACIgACIgoggAOei8+OvgaujjmerviOkNiOqOaOlteunbWun1iOmrm+LJCY6Qu55OmL5l+55My77X2a5wAjMtADMxgIvvHJgj36roz7rlDZjojqjmDJgjDStuaOg4SOkIa+nUeOj8+uKqs4plDIvlDInmTomn3Ipl75mljKnlX4vlHqilf7roriKgACIgACIKoJvvHJgj36roz7rlDJim/Jlnjqilr6hoDSLgQ6ukfIjmbLilrLvlDJgjrgC",
  EDITOR_PARTNER_BASE: "==ggAOOmimurXmumuWuvuiOjSWenAaOheaegAO+hWaeoNW+sGW+oniOj8+OmIaOn9SeqCiut5WehAiOn9Suj4S+rYaeoKW+u7SOhaeOo9SOIgACIgAiCRC44pIXZuRnchBFIlZXa0FWZyNEKgMaom3Kkm/JhmXbgnrJvv/IvlHKqm3YilPZvlDJgjrgC",
  EDITOR_PARTNER_NOVEL: "==ggAOus6e+pkW+ltW+h4SuvZeuu7WOheaeqKWeh+iOIqoSnAKelzaOoreei4SekHmOh7m+hWaek9eOnAKuKqAilIaOIpQXYDBSZoRHIlZXYThCIqoSnAKOqhiejLaugKi+t+WOilW+rWaOnAKuKqACqUe+v9Sum8+uKqIJilT4po/run/blpriKg4yMgACIgACIKIIgj3Ltmr6hoHpvovLgpTJukfKpl/orlL4pozYlnbJuk35vk7aonzIvvrprl7rrovpil/ril/SqJeenuW+L+uZ5wyZ5v85unv7snTomnbpopDrlmvpvkD5jm7LtmHYtm7oukr7nlrJvvriKFWY5pmo5a6a5+6K6qoCIuIDIgACIgAiCCC44dCo4nq75H2Y55K459i45cCo4MKZ5dCo42Sp5euZ5Uy65PyL5cCo4BC44dCo4GC55h665fSo5F6b5fyp5cCo4OqL5oyZ55K45NeY6My77RCZ5wWL6FOo5nmY5W265JiL5LiL5BC44tiL5BC44KiL5b6L5Q+o5ay77qoCl8aOqOaehDa+pJWuKqAiLxACIgACIgogm8+ekAOevDiOgKaunxW+k4SOtvi+jwW+hve+vVmOkAOOIgACIgAiC",
  EDITOR_PARTNER_ANTHOLOGY: "CC44Z+Y50u556OZ6zmb5NWY5/GY6My77u6K66ub5h6K6+6K6AGb5Tu75Eq55R6L67CY6OmL5ICZ5G2L5wiY5NiL5zOo5PSo5b6L5Q+o5My775K455m45H+65t+555+a5IKZ6ay77qoSouiuvuiOr9iejPWuKqAiLzACIgACIgoggAOOheautea+nAm+q/WOjhi+m/iOIqoSnAKelzaOn9SemGWesKiuqbmOnAKuKqAilIaOIqoSnAKuvwW+k7e+j8WeqIWOq6S+tCfKrmzJgiriKBC44qoSnAKOiQWOr9i+vJa+t1iOnAKuKqACqUe+v9Sum8+uKqQonmP5unf4rn36nnriKg4iMgACIgACIKIIgj7rrofYglDSK0BXZj52bDBCanlGSoASt/WugmaOmrmOhaeenAK+tgaujAaum8SuLu4CneaugmWOnAK+m+SOkPaum8+uKq4rrofYgl7JtmHJhoriKg0CIgACIgACIgAiCCC44Q2p5gS750+K6PCb5Qio5Y+Y5My77WyY5nmY5Pio5BC44WyY5gyb54Sa5BC44leb5gqY5vyp56mI6MGK6b+L6LqL5QC5556L6rqL6Wio5G6Y5Pu756qL5qiL5GCb5V2L5Caa53io5oS558+a5Hyo5ay77qoilMWOo8WOukWuhOW+j7euKqASLgACIgACIgACIKIIgjnIvvb7ukjYomHplnzqgmHIgjbIknbKvk3qulbrrlHIgjDZnmjpopnYukvLuk7prlDrjnrJvvLopljIvvLoioX4gmT7ro/IslTomnvpilDKvlfail/IimnInmfbhlrLukbJjlzavozppm36gn7YukX6nnHIgj/LqnXpimnakofYplHIgjv7lpDrlmnrgn36gnbIslrJvvriKWy755Sp57eZ6wap5ayL5+S65qoCItACIgACIgACIgogm8+uKqMpul/JhmXbgnPYhlrJplriKg4SMgACIgACIKoJvvHJgj37goDoim7ZslPJukb4mpfolm/yhveerfeOkAOOIgACIgAiC",
  EDITOR_PARTNER_RESPONSE: "=IIgjHrilPJvpzoklzLglf7ukr6unX4gmjoukn5unf7rozIvvrYgoL7lp/Kmmr6jlfLimjKlnzpnmLoplDSLgACIgACIKIIgj3Jgi/Jvvz4hpr6kljKnlnrgn3LinrKukDIukvIukzJgibJim3Jgi/JvvjYukD4uk/KmmfIjmvYimH5hpTomnL5povLukzJgi76lpL6rorJplzIvvfLimjKlnf4rn/blpn7rljokpDSLgACIgACIKIIgj3Jgi/JvvfKgmrrukjYukD4uk7rvojaooP7gmzJgibJim3Jgi/JvvjYukD4uk/KmmHoqnLrhlP4vljLomzJgi76lpL6rorJplzIvvfLimjKlnf4rn36nnn7rljokpDSLgACIgACIKIIgjLoioX4gmTomnPqtonInmT7mmr7ulTonmXanmnIvv3JgizbspHrspLqunzJgiHIgj3JgibJjl/JlnzYmpzJgiLopljIvvf6tlDoimzZvknphljIklP5unX5ro3JslzIvvb7lm/JhmXbgnvpvkD5jmjKnlrJvvriKneb5Aqo5oS55Q+L6oqY57iL5qoCItACIgACIgoggAOOp7S+hMaepOaOtbeOhae+tIaOqUe+s2ieo7aOiFWOm8SOItACIgACIgogm8+ekAOepVeulteOl6WejTWOkAOOIgACIgAiC",
  EDITOR_POLISHER_BASE: "CC44xS55GC555Sp5u+L5Oip50+K62mb5My77U+q55+a5Eq55OCZ5NmY55Sp5u+L56eY5Zu753+K6gACIgACIKACIgACIgoggAOei8+enAKuuuiuhQeesxWOsGWOnAKegAOenAK+nEaumAmOnAKugmWOi8++p3WOgKaOi5SOg7Suh6SOqUeOk/iuuHW+hMaep7S+rPWOj8+OqUeugAmOneaugmWOj8+utXausJiup2aOqcWum8+uKqg6imnrgnf6tlDoimriKg4SNgACIgACIKIIgjzIonbIol34ronrrlLavlHIgj3JgiboukzJgiHIgj3JgiTomnzJgiTomnnZvkfphlTampDKilrJvvriKX2a5Hap5A665+K75qoCIuQDIgACIgAiCCC44DKa5D+b5pm456qL5gip5N+Y5l2p5Jy77Ymo5YO45i2Z6n6L5Iy77ZaY5P+o5DKa5v645H+L6aCY6ay77qoykfaus4auq7eehDauKqAiLzACIgACIgoggAO+nEaOu1aeiyauu8WuniWOj8+ugKiuh7eeiniupniegAOeiniehXWegAOeiniOrQWegAOeiniuhniepFWOoKWum8+uKqkphl/4jm/JhmTpukriKg4iMgACIgACIKIIgj3Jgi3bmnH5jlfpvl/YjmLoioPbhlfIjmzIvvfbtoTrmmvYrnLZnpL5po3popb5ukzJgirLuknLlm3JgiTJsm/Jlnjovlb5ukzJgiroimrJvvriKsxWZUBCdn42bEBCL39GaTpiKg4SMgACIgACIKoJvvHJgjHJklnrlmbJjljJvkDJgjDCIgACIgoAIgACIgAiCCC44zGZ5JFEpZmOi2aOj8++nEaepFW+o7S+hNWOkPaOj8+Olse+hWaulMWOm8S+rYaeoKW+u7SOhaeOo9SOIgACIgAiCRC44pIXZoNXas9GUgQHelRFKgYrrlPJukLbiobqtmrJvv/IvlHKqm3YilPZvlDJgjrgC",
  ANALYSIS_BASE: "=8JvvH4klzZvkj6gpr6klbJimbrrl3Ikl3Yvkr6klzLvkvbsnzLom74oprJvvriKU+q55+a5BOZ5c2L57G75MCZ5qoCIuQjCCC44kyL5sG656eY5Hyo5My77E+K65K45MiI6S+q5ay77qoiruiuu7W+m/ieuUauKqAiLzoggAOeuWaOscWOhaeevlW+l+WumBWum8+uKqApnmbZilnrgn7qukriKg4iMKIIgjz5unnIhovoukXYlmz6imLopmHopoDornrJvvriKYu55NSa5FOo5nmY5qoCIuEjCay77suo5FyY5KIIgjrYklXqimDpnmbIilfZrlfolmTomnP7jlb6tlfZrlDCMwUDI9uL5AiL5ZaY5wKp5Pyb58Cq5g42dvR2ayFWTggKlnf7rozIvv7IklvYuk7ajmDblmDiTPNlSggKnlrgm8+ekAOuhIWOqDmuiRWepKa+ltW+hWaOkAOuCK0nC9BCIK0lIygpopvLukLCIsISMYKa67iL5isFI6Iycl1WZoRVZy92YiACIgAiCsIigAOOhvierfeenviepPWOg4SOhaeeqIWOgKe+rYaOjHmem/iuIgojI3VWa2VmUl5WaMVmbvJCIgACIKwSfgACIgoAO4AiOicmbpNWYwJCIgACIgAiCsATOgojIyVGdjFmchh2YiACIgACIgoALwYDI6ICa0BXZkJCIgACIgAiCsgzNgojIlxWe0NnIgACIgACIKwSN4AiOiQ3bsBnIgACIgACIKsHI6IyZulGdhJnIgACIgoALdBCIgAiC9BjNgojIlJ3bjNnIgwiIu9Wa0VHbvNXZSJCI6ICduVWbnV2cisHIgACIgAiCs0XN5AiOiUmcvN2ciACLigXYtlGbDJCI6ICduVWbnV2cisHIgACIgAiCs0HM3AiOiUmcvN2ciACLicmbpNXaSJCI6ICduVWbnV2cisHIgACIgAiCs0HM1AiOiUmcvN2ciACLicmbpRXaj5WSiAiOiQnbl12ZlNnI7BCIgACIgoAL9BzMgojIlJ3bjNnIgwiI0JXY0NlIgojI05WZtdWZzJyegACIgACIKsFI6IyYyFEduVWbpRnblNnIgACIgowegojIzl2c5xWYuFUey9GdzJCIgoALdBCIK0nIVGb5R+Y5iAiOiwWZiFGbiACL1QDI6Iibvl2cuVGdiACLyAiOiIXZ0BXYoNmI7BCIgAiCs0nIr6Z56OZ6iAiOiwWZiFGbiACLwIDI6Iibvl2cuVGdiACLxAiOiIXZ0BXYoNmI7BCIgAiCpADMx0CMoAip6WOo8W+p0e+jlWugKiOoreOhQWOkeauhIWOj8+Otvi+jwW+hve+vVmeuvWOiSmeh7SOIv8CIbBiOi0Ga0lHayJCIgoALdBCIK0HOgojI05WdvNmIgwiIyEaso/IhmLCI6ICZy92disHIgACIKwSfwEDI6ICduV3bjJCIsISMhGL6PSo5iAiOiQmcvdnI7BCIgAiCbBiOiMHZy92d5V2aiACIKsnCKoJvvnIvv3KukDCYgBGIu4iLg42bzpGYgBGIoyZ55OK6FyY5g40TTpEIGCb5FCI6Wio5My77yiL5my65X2a5g40TTpEIeuZ5U+L6l6o50u55My77X2Z5BC65juL5g42dvR2ayFWTggKln/bvkHopo3IukjIvvvIukLoplTonmP5unzIvvHason7rlDiTPNlSgoKukDIuk75mlT5vof7rorgm8+ekAOugxaegmi+j8WOvgauuHW+k+iOkAOuCKIIgjb4hl7rsnTJuknKilDoinzIvvT4ro36nn7Ztoj5qpTomnPHZhVmck92bH9yoTeuhxiOv8S+uxeum8+uKqkydllmdlJFIl5WaMBSZu9EKgQ4ro36nn35roX6jlDIukriKg4CNKIIgjPIulbIilnrgn3LinHIgjPZvlfpvlXalnb6rorJvvnyZul2YhBFKg8YplLoioDSLgACIKIIgjnYhlfKvl/blpDJimHIgjbqul7Immzpsp7rrorrukrJvvniclR3YhJXYoNEKgkainrrukDSLgACIKIIgjjqroLqjmfKgmrrukHIgjnYuk/IhmrJvk7LpnHIgj/Ihmv4qnrJvvnCa0BXZEhCImqb5xer5g0CIgAiCCC44PWa5CqI6BC44fSo5i2Z67S55BC447eJ6N+K6ay77pUGb5R3UoAClse+hWaOItACIgoggAO+pAaek+i+uAmegAOOmKaOr9iegAOet/WOrCaum8+eK09GbQhCIFOo5nmY5g0CIgAiCay77qoSK0JXYoNEIyFGZhJFKgYIilT4roT7unTpukriKg4yMKIIgjnIvvDDMx0CMIy77GiY5Tmo52mb5My77Jy77AGb5Tu75BC44u2r5Yua6BC44VGb5R+Y5BC44H+65Ayb5Iy77PyL53WL6qu75FOo5Eq55LqL5FWp5Q6p5GiY5ay77qoSKjJXQgQnbl1Wa05WZThCI/q75yup5qu75FOo5qoCIuIjCCC44Jy77fKZ62ep5BC44+uZ63+L6BC44Q2a5cWZ6ay77Caa5Iy77T2L5pm45Wio5N+K6RKa6Yua6Eq55JmL5PSo5B6b5hGL6Jyp53WY5BC44w6456eY5NSa5N+Y5tiL5Hap5W+Y5Q+o5ay77qoSK5JXZnFWbJBSZy92QoASoxi+jEa+g/WOugauKqAiLxogm8+ekAOup6WOt7eOkeauhIWOkAOuCKIIgjrYklXqimDpnmbIilTomn3Lslb6ro37ukDIukDJim/JlnbbulzIvvHJgjDLvkT4rof4rnjahl/ip5SOqFWup6Wes3aOkAOOjhi+m/iOrca+hWaOhae+m+SOkPaeuvW+rYaeoKW+u7SOhaeOo9SuCCC44Wy757iL5Hap5R275xer5EWL6MKZ526a566K6E+K6m2a5Hap5Eq55aiL5TiL5N2L5AiL5vip5g2L5",
  ANALYSIS_NOVEL: "CC44+6K66OZ6Eq55Uy65PyL5/q75/WZ6K+Y5luL5My77bqY5Vyb54CZ5Eq55dCo4gu65JiL5ReY6Eub6cCo4Q6p5GiY55K45NeY63+K6gACIgACIKoJvvHJgjT6ukfIjm7ZslPJukT7ro/Islf4rn/blpDJgjrgC",
  ANALYSIS_ANTHOLOGY: "CC44bqY5R+Y5Gi45Eq55FaY5Fmb5H+65t+55K+Y5luL5My77mqb5bqY5s2L6N+Y5Eq55dCo4+Cb5Tu75Pyb5piY5oqL53K8psaOnAKOkeauhIWeuCeejHm+tviOIgACIgAiCay77RC44kuL5Hyo5eGb5TiL5GuZ6Hap5vc4rn36nnDJgjrgC"
};

export const getProofreadSystemPrompt = (ignoreWords: string[] = []) => {
  let prompt = d(PROMPTS.PROOFREAD_BASE);

  // Inject User Memory (The Whitelist)
  if (ignoreWords && ignoreWords.length > 0) {
      prompt += `\n\n【用户专属豁免词表 (Author Whitelist)】：
以下词汇/短语是作者的特殊设定或个人风格，**严禁视为错误，必须直接忽略**：
${ignoreWords.map(w => `"${w}"`).join(', ')}`;
  }

  prompt += `\n\n【特别注意】：
1. **标点符号配对**：严格检查成对标点（如「」、“”、【】、（））是否缺失闭合符号。
2. **逻辑缺字**：检查句子是否因缺字导致逻辑不通或语义断裂。
3. **句末标点**：检查段落或完整句子末尾是否缺失句号或其他结束符号。
`;

  prompt += d(PROMPTS.PROOFREAD_OUTPUT);

  return prompt;
};

export const getDeepCritiqueSystemPrompt = (subGenre: string, ignoredTags: string[] = []) => {
  let prompt = d(PROMPTS.DEEP_CRITIQUE_BASE).replace('{{subGenre}}', subGenre);

  if (ignoredTags.length > 0) {
      prompt += `\n\n【忽略规则】：\n请不要针对以下标签或问题类型提出建议（作者已明确忽略）：${ignoredTags.join('、')}。\n`;
  }

  prompt += d(PROMPTS.DEEP_CRITIQUE_OUTPUT);
  
  // Force JSON format with specific schema
  prompt += `\n\nIMPORTANT: You MUST return the result as a valid JSON Array. Do not wrap it in markdown code blocks. Just the raw JSON array.
  
  The JSON object MUST follow this schema:
  [
    {
      "tag": "Short tag (e.g., 节奏, 人设, 剧情, 逻辑)",
      "quote": "The exact original text segment you are critiquing (must be found in the input)",
      "advice": "Your detailed critique and specific suggestion for improvement"
    },
    ...
  ]
  `;
  
  return prompt;
};

export const getSearchSystemPrompt = (isNetworkEnabled: boolean) => {
  if (isNetworkEnabled) {
    return d(PROMPTS.SEARCH_NETWORK);
  } else {
    return d(PROMPTS.SEARCH_LOCAL);
  }
};

// ... (Rest of file unchanged)

type EditorMode = 'critic' | 'partner' | 'polisher';
type BookType = 'novel' | 'anthology';

// 细分流派 Prompt 映射表 - 基于文档深度优化
const GENRE_PROMPTS: Record<string, string> = {
  "xuanhuan": "=IIgjH5jlbIin3IukXYukrKplHpimvojlHIgjX6umv5smP4vl34rmPKnlHIgj/YnlnKtlvpiljJimrJvvriK5K453uZ6qoCItoggAOOmIaekMa+p6eui2iegAOujZi+gQWuqMeurJaegAOeriiuhAmOkda+n6Wum8+uKqkrgn3LinriKg0iCCC44Jy77fS55CGr5vQqimjorl/yh7SejkWOi8+uucaOqKWuu8WOmPWOhaeOiDeuu8Weica+uhmeh/Wum8+uKqI5povLukriKg0iCCC44liL5uOq5nq75J265My779Sr5qeI6UiL5nSa5P6a5ay77qoigniOjVeul4SuKqASLKIIgjnrgn3LinfIjmvYimH5hpHIgj/YplLoiofqunfYjlHIgjv7snPZvkvpiljJimrJvvj6smPbhlP4vljLomrQkAOeK5NXY05WYGBCbhRnbllmcPhCI7mb5E645ay77+Sr5BWr5QC44",
  "xianxia": "CC44a6a5+6K6Gu75m+K6Eq559WY51G45BC44VOr51iZ6BC44v2I65iL5BC44d6a5VOr5ay77qoisJieuJeuKqASLKIIgjnoukvYukPZgpfKplHIgjfplmnoukj6lpfprlHIgjrrukDYnm3prlrLplrJvvriKBq65yaY5qoCItoggAOei8+eg1aOjVaOoXa+LBWr56qL5heY5Iy77Y2a52mb5fy55u+L53WY6L6q5OiL5YOa6YOa6UCr5ZuL5ay77qoCtbW+mwauKqASLKIIgjjJvnrLnmzpnmD6mlHIgjX7vlfaim/Jln/blpHIgj/pgm/JhmP4vlPZgprJvvj6smPbhlP4vljLomrQkAOeKhlGeuFWaYhCIg6L5ZuL5ay77+Sr5BWr5QC44",
  "urban": "CC44P2L5Tqo5FCI67+K6rKK6Tip556a5eSr5Pyr5R6L67CY6My77e6a5w645R+L60SL6qSa5OqL5xS55ay77qoSuCe+tbmuKqASLKIIgjTLsmfpvlzbspLoplrJvk7LpnP6ukDrjnjKnl76tlvpil37gobJim76tl/agmH6vkjKlnnKilzIvv/Jln34hp/yn7e+uze+LL6451WY5vsLjl7ZpnrJvvriK5K459i45qoCItoggAOuhbmuhvWegqeusGWuvbe+mfeOj8++jlWugKi+q/Wum8+uKq8YplLoioriKg0iCCC44ECb5gip5e6a5w645BC444SI6Tmo58CY6FOK6BC44fSo5lWY5juL5ay77oOr5zWY5D+b54Cq5KEJgjnibhJmcVhCICib59OY6ay77+Sr5BWr5QC44",
  "scifi": "CC44WyY5Cyb5Eq55nCo56qL55+a5vyp5Aqo5o6K6i6o5My77dCo49Sr5qeI6cCo4Wio5dCo4sG65cCo4BaK6a6a5+6K6Aqo5Re65ay77qoSuCeejHmuKqASLKIIgj3qom/bqnrbqnb7lmHIgj/Jnl/pulbJukvKnmHIgj7ImmfolmXYmp/JmmHIgjvYhlvInmrZjlvZtorJvvriKL6Z57G75qoCItoggAOOl8aOqOaepdauqcaegAOuhvWep4Sek+i+uAmegAO+jEa+mIWun0aekEium8+Oqza+sFW+g/WOugauCRC44pkmRtk2YThCI7mb5Re65ay77+Sr5BWr5QC44",
  "history": "==ggAOei8+usPWuhOWuupeutea+rYaundmOpZmOi8+uhviOu4WusPWuhOWOjDien/iejHmep4Sum8+uKqkrgnf7mpriKg0iCCC44c6r5Cu459yo5bqY5tiL5BWr5qSr5y+Y5G6Y5oyZ5Wio5My776qL5k+Y57eY5Tmo50u75NmZ6G+K6l+55juL5w645oS55piY5ay77qoSuCe+iceuKqASLKIIgj/Jhm3LinTomnL7jlbojlj5jlnLlmHIgjjIvlrZjlvIsoPYnmHIgjjKsoXKuk7ajmPIgorJvvj6smPbhlP4vljLomrQkAOeK5J3b0NXaIhCIy+Y5G6Y5ay77+Sr5BWr5QC44",
  "suspense": "CC44nOo5QGo5gCY62iY5dCo4l+55qyp5cCo4oS55piY5My77Rqo5L6Y5Cyb5h+K6BaK60uZ5bCr5My77xiZ63mZ6R6L67CY6Jyp57Ga6F+b5ZiY5EeK6ay77qoCiwiuqAaemIWOhniuKqASLKIIgjbLlm75mlnInmHopo37gpLKtn/runrKukDIuk/4rmLIgjz4hpPYjlTJrn/IvkzIvv/runDbgnf4monYjorJvvriKneb5Aqo5qoCItoggAOOr9iejPWegAO+rOeerXmek+i+uAmegAOOoAmepQiOtbW+mwaum8+Oqza+sFW+g/WOugauCRC44pIXZsxWayhGVvU2cuVGczV3UoAimCauiDa+LRa55sKo5ay77+Sr5BWr5QC44",
  "romance": "CC44zWa5xSL63S55jir5BC44FOo5nmY5Wuo5MGK66yb5ayL5v+K6ay77qoSuCe+tbmuKqASLKIIgjnIvvvonl/blpDJimbJimjIvvL5opvLukPbplzIvv/4iovLukfLlnLIgjHaooPbulTomnP4vlDZmo7Iukb5snLpkmrJvvriK5K45NeY6qoCItoggAOOqKWuk6SeqJeuu6SegAO+nEaOUDFIgj/aimn4im/JhmX4gmrJvvj6smPbhlP4vljLomrQkAOeKlNmbh12bShCIFOo5AiK6ay77+Sr5BWr5QC44",
  "guyan": "==ggAOei8+eqJeOqZWegAO+njmurlmegAOOslmejcaOi8+OtHiuvyeegmiemGW+jPaugKiuh7eugAOOsUeejne+LXap5r6a5vcplmXorlrJvvriK0uZ5bCr5qoCItoggAOOshiOtFW+jXautuWegAOutpe+gAiuq7SOvkeegAOehbmOpPWOlse+hWaum8+Oqza+sFW+g/WOugauCRC44pU2YuFWbvJFI05WZpNmbBhCIAiK6k+Y5ay77+Sr5BWr5QC44",
  "fanfiction": "CC44Uqb5IWp522J602J6Eq55FOo5nmY5f6Y55+a5lWY5LuL5SeK67iL5ay77qoSuCeejHmuKqASLKIIgj7rhmfZgpfZko/pjlXaooXKvlHIgjnIvvravnvbrm/KmmP0TPhIvv7rrorruk/pjlj5vorJvvj6smPbhlP4vljLomrQkAOeKu9Wa0NWam5WYGhCI6qL5MCZ5ay77+Sr5BWr5QC44",
  "game": "CC44fSo59i45BWr5u2o5wWp5BC44AGK6tO45eu651S55BC44+G45pSa5buZ5sy65ay77qoSuCe+iceuKqASLKIIgjjqilLpukbrrlnqjnHIgjHaooPbulrJukzYgoHIgjjKsoXKuk7ajmDblmrJvvj6smPbhlP4vljLomrQkAOeKl1WYHhCIPio54ir5ay77+Sr5BWr5QC44",
  "other": "==ggAOetfmem9SeicauvwW+k7eOj8+OmKauozaeicaOtXmer4SOj8++mKWel8WOuQWeica+hveOg8Wen/SurheOj8++pAa+uvi+rPWOjSW+pAaek+i+uAmOhae+i6SehVaejHmOqza+tviuCRC44oS55aCY6ay77+Sr5BWr5QC44"
};

// ============================================================================
// 写作技巧库 (Writing Techniques Knowledge Base)
// ============================================================================

// Decode GENRE_PROMPTS
const DECODED_GENRE_PROMPTS: Record<string, string> = {};
Object.keys(GENRE_PROMPTS).forEach(key => {
    DECODED_GENRE_PROMPTS[key] = d(GENRE_PROMPTS[key]);
});

const WRITING_TECHNIQUES = {
  universal: [
    "CC4448SMgkphlr6jlzIvvnIvv34roD7jlzZvmjIvvvIukTLsmjKnlnrrlXohlTomnDCOvcDI6kSehd3ZulWblhEItASey9WZoRFInJXZiV2YJhCI66K6GC55xGb5waY5",
    "CC44N+K656a5i2b5/up5juL5ZaY5P+o5Y6a5fSo5MKZ5c2L5oqY5oS55goTKsxWZUBCdn42bEBCL39GaThCIw+L6y6K6e2Z6MCI66S65VGb5",
    "CC44oS55c2L53WL6Hap5OCZ5oyZ57Ga6F+b5gS75DWY5Eq55w6456eY5goTKuV3RgM3J29GarVGaDhCIq6p5LmL5rSa5D+K6RWa5",
    "==ggAO+mKW+lPW+nEaOoKWuniWOj8++nUeOjZm+l+WOmPWeqJe+i6SOhaeeiCa+nGeequiOI6kSerNndvx2aoNFItAibvlGdhpXayFWaslWbhZWZEhCIWyY5fS55MmZ6",
    "=IIgjvqnlr7kpX6hn/qnmf4voP7tozIvvXahlfIil7avmj5qpbJimHoqnLrhl74ukXqjmT7mnDiOpMXZSBSYpRWZNBibJhCILea5Ayb5tiL5c2L5oqY5oyZ5",
    "=IIgjHopo34hp3IukbbulvquozKnmzIvvH4klnainP4vljLomTomnXZslH5jlX4gmfailjqiljqjmDiOps2YvNGajRXaIBSLg4WamZWdHNWYNhCIsqI68Cq5mqb6",
    "==ggAOet/WOrCaOoAmutIWOj8+uo0e+v6eOhaeehAi+uviOvvW+rviOI6kyZulmcyVGSgQWZShCI8Gb6xKb6iq75",
    "CC44NOZ5euZ5Jyp5OCZ5My77r6Z56OZ6Jyp5NmY5goTKzt2YhJGbsF2QgYCIn5Wa39GZhh2clJ3bGhCIUqb58GZ5OiL5Uy65PyL5",
    "CC44+uZ5PSo5e6a5fy55Eq55j+Y56eY50+K6qyp5tiL5d+K65+a5goTK0hXZ0JWdThCIN+K6w+Y5c2r5",
    "CC44ueb5PGY5l+55k6K6Wio5OCL6SKp59OI6v+Y5FCI6w+L6Z+Y5goTKy9GdhJnch5EIlxmYhlGblJnbVhCIFCI6w+L6Z+Y5g2Z6v+Y5NiL5",
    "==ggAOOqKWeg1aOhaeOt7eenAaeqJeuu6S+nLaeooaOI6kyczVmbzV3bpN2cu92QgY2bg0WYlJHdThCIBWr5G+K6PSo5",
    "==ggAOei8+enAKusJiOnimOhaeeuXmetQWOnAKugmWOi8+emGW+jPaOmuW+nEaOiQW+t3aOI6kSYpNXZoR3cl5WeThCIfSo5aCY6",
    "CC44FOo5D+b5pm456qL5ECb5gip5ZaY5P+o5DKa5v645goTK5NWYsxWYGByYpRXZoRXYQhCIFOo57e65",
    "==ggAOOiVaeicaOgcaejkWejHmeosaenAKei4SOnAKOhaeOktW+i+SulIa+jlWugKiegAOOhea+k7eOI6kSZlJHaUBiZvBSZsVnUgUGaUhCIL6b5AiL5JiL5",
    "CC44a6a5zaY5g4TLgMoolD7mlDiPtACl6WejPWOI+0CIoqY5MGK6goTKsVWdxV2UgQmbhBSZuV2YThCIH+65tu75OiL5vmp56yZ5",
    "CC44E6p5Tu75Eq55pQnblZXRoY7ukvoukHIgjniclR3YhJXYoNEKpm456qL5BC44pEWZklEK1+b5GC55BC44pUXZpxWaNhygiW+rOeeuvWOiSmOI6kCduVWa09WdRBSRDlUToACsVauhVWeRDlUT",
    "==ggAO+mKW+jEaOqzaOhaeehAi+uvi+j9S+kKa+sNW+hveOg8WOI6kyav9GSgUGaUhCIQ2a5pKZ61+b5sKo5",
    "=IIgjn4pob6poHIgjn4poPbklHIgjn4poX4llHIgjn4pozKklHIgjn4pob4poDiOpMHbpFGdlREI5J3bz5WZThCIZaY5P+o5Y6a5fSo5aSa5",
    "CC447eY5yaY5fSo5FOo56yb5eKa5ueb5N+Y5H+L6aCY6goTKu9Wa0l2cvBXY0hXdKhCIFOo5AOZ5ZaY5vmp5QmL5luL5",
    "==ggAOOtXmuupeeoxi+sDaehAi+uviem7eOj8+eo7aemGWej4SOI6kSZjFGcTBSZ2lGdhdWZOhCI9m55ZW55",
    "CC44SeK67iL5ZaY5l2p5Uqb5N+Y5Eq556qL5Bep5H+L6aCY6goTKu9Wa0BXayN2clREIlRWaThCIYmo5YO45i2Z6n6L5",
    "==ggAOekPWuhIeOhaeevIeOtbauh6Suu4S+rYauq7eehDaekKa+iOWOI6kSZzFWZsVmUgQmbhBCc11CZslWdChCIsmo5OCZ5Rqo5IWY5",
    "==ggAOOlse+j8S+v6e+vVmOhaeevUiOkamutFWegeaOI6kyZul2dvRWYoNXZy9mRg0mclRXLn52bMhCI/q75wG45HuJ6J2I6",
    "==ggAOum8Suvkeuj4Suu6SegAOekIauqHiuj4Suu6SegAOutEeuqHiuj4Suu6SegAOuu6Suj4Suu6SOI6kCdjlGbm52bDhCIBq65yaY5+u55b+55",
    "=IIgjX4gmHbhlv4qnr7ulzIvvvouk3bplb7ukrZglf4rnDIvljKnlL5povLuknqroDiOpQXYDBSZoRHIlZXYThCIqKZ5ry45RWp5",
    "=IIgj3LkoXrrmTomnjKlnD6lmbYvknohpbbmpHJimr6honojmDKilDiOpM3ZulGbyFGRgIXdvlFIsxWaLhCIdSL6d6a5Eq55g2L572q5A2p5",
    "CC44pm456qL5Eq55/WZ6Qio5ayL5BC44+u55b+55hur5FWY5goTKzJXZ0NWYyFGaDBCZuV3bShCIpm456qL5i2b5GyZ5"
  ].map(d),
  novel: [
    "=IIgjXanmLZvlDiPtASmSi+rQWOI+0CILi65vCZ5goTKsxWZiBXbhNEItASel5mc19mSgM3JvJXZIhCIFep5LmL5EuZ6xuI6",
    "CC44mmL5syp5AiL5Qio5VGb5pmo5d+K6l+Y5AiL5OuL5goTKk9Ga0VWTgU2ahxmZ39mbThCIVOr5c2L5ZaY5xqI6quZ6",
    "CC44ICZ5HGr5OCZ5Ayp5My77Hu75kqL5iS75/q75h2p5kiL5goTKzVmbpxWey9GdTBCblxGbhJXYQhCILqL5Z+Y5/q75M+Y5",
    "CC44JWY5zmb5Wio59CJ6VCa5RCZ5fSL6BC44/WZ6Qio5RCZ5j2q5goTKjJXQgIXZ0NWYyFGaDhCIJWY5nyb5pm456qL5",
    "==ggAOei8++nEaOmneunleOi8+umuWuvui+r9iOIzZXi8+uhvWep4SemIWOhniOi8+umuWuvuiOrheOI6kyZulGZslWdCBCZsJ3bXhCIE6p526p5CeK6MW55WiL5",
    "=IIgjnIvvT7lp3LkoXrrmjIvv/YplLoioL4po7qvl7IuknIvvT7lpLoioD6qnjIvv/YplLoioL4po/orlDiOpcmbpNWYQhCI2iY5n6o5PWa5CqI6",
    "CC44xqY5WWa5g4TLgE5jlbIinDiPtASjie+uYmOI+0CIF6b5fyp5goTKw92bMBSZulWbhB3bEhCIv645q6b55K459i45",
    "CC445K45FOo5nmY5uSZ6zWY5qiL51EDI6kCdlVGaTBCdhVmQgQXYDBSZoRHIlZXYThCIoGK6Nuo5CqI636b5IWa5vap5",
    "==ggAO+hgaurbeukni+u4SOmPWeuUaOj8+ehVaOmPW+pkWejHmOhaeOtXmer4S+i6SehVaOI6kCbhNnclZXZSBCdul2bwRWaNhCIYqo5s2L65K45tiL5",
    "==ggAOOktWeqSmemVeegmievDmuvwW+k7eOoreOg4S+jvaOI6kicldmbhhmZmlGbDhCI+Cb5Tu751+b5sKo5"
  ].map(d),
  anthology: [
    "CC44s2L6N+Y5Eq55tiL5LmL5GC55FOo5My77WSa5LmL5Zap5PSo5goTK0NXa3RFI5JnblhEIu8EKg4LslP5un/IvlnKiljqukfrwnyq5",
    "==ggAOeoKWejcauq7eehDa+g/WOugauq4SOg4Suu4SuqPW+hveerfeOI6kSZvBFItACdjVmZmVEIlx2Zul2UgUGaUhCIUqb5IWp5AiL5V2Y5",
    "CC44i2Z6tap5qiq5qiL5AiL5Eq557Sr5fS55W+Y5qio5goTKlZWaMBiZvBSZjlGbThCILqL5Z+Y5Pyb5Hm45HiY5",
    "CC44e6a5w645Eq553aY5waY5My77AiK6t+K6Eq552iY5LWY5mqb5B6p5goTKyVmdyF2Qg0CItNXasFWbp5WaNhCIJmL57iL5A665B6p5",
    "CC44O2Y5H2Y5eW65+K75X6b536I60eZ6s655oyZ5pm456qL5goTKlNWevpEItASeuFGawlGcFhCI7iY52ep5fKo5/Ga6",
    "=IIgj/IhmvJilnbinz6inTomnXIumT7ro37goHLsl35roX6jlDIukDiOpQHclNmbvNEIodWaIhCI1+b5Caq5Yua6",
    "=IIgjj5jlL7tlnYuk/IhmbYvkzIvvTLplDIvlDLil75ml7LslP5unDiOpUmc1R3Y1JHdTBichxWdjJXaDhCIUqb58GZ5+Cb5Waa6",
    "==ggAO+gAienAaekPWel8WOj8+OgxW+k7e+hIWurheem7eej4SOI6kyZulGZuVEIuVGcPhCI+Cb5Tu759m55ZW55"
  ].map(d)
};

export const getEditorSystemPrompt = (mode: EditorMode, bookType: BookType, modelName: string, subGenre: string = '') => {
  const isDeepSeek = modelName.toLowerCase().includes('deepseek');
  const isNovel = bookType === 'novel';
  const genreAdvice = DECODED_GENRE_PROMPTS[subGenre] || DECODED_GENRE_PROMPTS['other'] || '【流派：通用】\n请注重故事的逻辑性和可读性。';
  
  // 1. 基础人设 (Base Persona)
  const techniquesStr = `
【写作技巧库 (Writing Techniques)】：
你熟知以下写作技巧，请在点评或建议时灵活运用（不要生硬堆砌，要结合语境）：
${WRITING_TECHNIQUES.universal.join('\n')}
${isNovel ? `\n【长篇专属技巧】：\n${WRITING_TECHNIQUES.novel.join('\n')}` : `\n【短篇专属技巧】：\n${WRITING_TECHNIQUES.anthology.join('\n')}`}
`;

  let prompt = d(PROMPTS.EDITOR_BASE).replace('{{techniques}}', techniquesStr);

  if (isDeepSeek) {
    prompt += `\n【思考协议】：在回答前，请先进行 **【思维链推演】**，分析用户的潜在意图、流派特点（${subGenre}）和文本深层结构，然后再给出 **【最终建议】**。\n`;
  }

  // 2. 类型分流 (Novel vs Anthology) - 严格区分
  if (isNovel) {
    prompt += d(PROMPTS.EDITOR_NOVEL_CONTEXT);
  } else {
    prompt += d(PROMPTS.EDITOR_ANTHOLOGY_CONTEXT);
  }

  // 3. 注入题材微调 (Sub-Genre Injection)
  prompt += `\n\n${genreAdvice}`;

  // 4. 模式特化 (Mode Specialization)
  switch (mode) {
    case 'critic':
      prompt += d(PROMPTS.EDITOR_CRITIC_BASE);
      
      // 短篇/文集 专属开篇指导
      if (!isNovel) {
          prompt += d(PROMPTS.EDITOR_CRITIC_ANTHOLOGY_EXTRA);
      }

      if (isNovel) {
        prompt += d(PROMPTS.EDITOR_CRITIC_LOGLINE_NOVEL);
      } else {
        prompt += d(PROMPTS.EDITOR_CRITIC_LOGLINE_ANTHOLOGY);
      }
      break;
      
    case 'partner':
      prompt += d(PROMPTS.EDITOR_PARTNER_BASE);

      if (isNovel) {
        prompt += d(PROMPTS.EDITOR_PARTNER_NOVEL);
      } else {
        prompt += d(PROMPTS.EDITOR_PARTNER_ANTHOLOGY);
      }
      
      prompt += d(PROMPTS.EDITOR_PARTNER_RESPONSE);
      break;
      
    case 'polisher':
      prompt += d(PROMPTS.EDITOR_POLISHER_BASE);
      break;
  }

  return prompt;
};

// ... (Rest of file unchanged)
export const getAnalysisSystemPrompt = (bookType: string) => {
  const isNovel = bookType === 'novel';

  let prompt = d(PROMPTS.ANALYSIS_BASE);

  if (isNovel) {
      prompt += d(PROMPTS.ANALYSIS_NOVEL);
  } else {
      prompt += d(PROMPTS.ANALYSIS_ANTHOLOGY);
  }

  return prompt;
};
