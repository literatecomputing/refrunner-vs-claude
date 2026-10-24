# Can Claude check a reference list? RefRunner vs. Claude, October 2026

We gave Claude (Opus 5.5) and [RefRunner](https://www.refrunner.com) the same
reference lists, with problems planted in them, and graded what each one
caught. This repository holds everything needed to check our grading or run
the test again: the lists, the answer keys, every raw answer, and the
scripts.

It was prompted by LinkedIn posts about how to stop Claude from inventing references. Invented references are a big part of why people want a tool like RefRunner, and if people are asking Claude not to invent references, some will also ask it to check them. So we measured how well it does.

## The 85-reference test

The list: 65 accurate references (62 cited in 2025 _International Journal of
Artificial Intelligence in Education_ papers, plus 3 _Journal of Learning
Analytics_ papers published July–August 2026, after Claude's training data),
6 papers retracted between March and October 2026, 6 invented references,
and 8 real papers with one thing wrong (2 titles, the authors, 2 years, the
journal, the pages, the DOI). That makes 20 problems.

| Setup                                     | Problems found (of 20) | Retractions (of 6) | Time  | API-price estimate |
| ----------------------------------------- | ---------------------- | ------------------ | ----- | ------------------ |
| Claude, plain chat                        | 12                     | 0                  | 48 s  | $0.19              |
| Claude with web search, run 1             | 19                     | 6                  | 203 s | $1.10              |
| Claude with web search, run 2             | 20                     | 6                  | 213 s | $1.12              |
| Claude with web search, run 3             | 18                     | 6                  | 209 s | $1.18              |
| Claude, told to search every entry, run 1 | 20                     | 6                  | 348 s | $2.20              |
| Claude, told to search every entry, run 2 | 18                     | 5                  | 348 s | $3.54              |
| Claude, told to search every entry, run 3 | 17                     | 4                  | 301 s | $3.24              |
| RefRunner                                 | 20                     | 6                  | ~49 s | —                  |

- **Plain chat** spotted the invented references but had no way to see a
  retraction from this year. It said so: "I am not aware of a retraction for
  any of these references."
- **With web search**, Claude was very good. It looked some entries up and
  took the rest "from my own knowledge", and its misses (#58, a DOI with two
  digits swapped; #65, a wrong title) were in entries it had not looked up.
  Each run missed something different.
- **Told to look up every entry** and return a corrected APA list, it was
  slower, used two to three times as much, and did worse on retractions: in
  runs 2 and 3 it marked retracted papers "Real, accurate. Confirmed." and
  kept them, unmarked, in its corrected list. It also flagged 9–11 accurate
  references, mostly to prefer the issue year to the online-first year,
  which is a fair note rather than an error.
- **RefRunner** flagged all 20 and gave one false warning in 65 (#40, where
  Crossref's own record misspells an author's name).

In fairness to Claude: with search it noticed that the Crossref record and
the publisher's website give different pages for one paper (#30: Crossref
72–77, the IJCA article page 71–76, and the printed PDF 60–65), which
RefRunner, checking only Crossref, can't see. It also named the real paper
behind one invented citation.

## The 16-reference test

An earlier, smaller list: 8 accurate (2 published August 2026), 2 retracted,
3 invented, 3 with an error.

| Setup                          | Problems found (of 8) | Retractions (of 2) |
| ------------------------------ | --------------------- | ------------------ |
| Claude, plain chat, 3 runs     | 5, 6, 5               | 0, 0, 0            |
| Claude with web search, 2 runs | 8, 8                  | 2, 2               |
| RefRunner                      | 8                     | 2                  |

On this list Claude with search did better than RefRunner: RefRunner
reported the wrong-title (#14) and wrong-authors (#15) references as "not
found" rather than naming what was wrong, and gave a false warning on #8 (Crossref misspells
"Ocumpaugh" as "Ccumpaugh"). Claude with search named all three correctly.

## Files

| Path                                                             | What it is                                                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `data/references-85.txt`, `data/references-16.txt`               | The lists, one APA reference per line, as given to both tools                                                                          |
| `data/answer-key-85.json`, `data/answer-key-16.json`             | What each reference is (`real`, `retracted`, `fabricated`, `corrupted`…) and what is wrong with it                                     |
| `data/cited-dois.txt`, `data/pool.json`                          | DOIs cited in 2025 IJAIED reference lists (from Crossref), and the records the accurate references were drawn from                     |
| `results/85/claude-*.md`, `results/16/claude-*.md`               | Claude's answers, verbatim. The first line records time, turns and the CLI's API-price estimate (`mode=strict` there is `every` below) |
| `results/*/refrunner.jsonl`                                      | RefRunner's result for each reference, from the batch script in RefRunner's private codebase that runs the same lookup as the website  |
| `scripts/ask-claude.mjs`                                         | Gives a list to Claude through the `claude` CLI                                                                                        |
| `scripts/grade.mjs`, `scripts/grade-refrunner.mjs`               | Grade an answer against an answer key                                                                                                  |
| `scripts/pool.mjs`, `scripts/build-list.mjs`, `scripts/meta.mjs` | How the 85-reference list was built from Crossref                                                                                      |
| `RELEASING.md`, `.zenodo.json`                                   | How releases are archived on Zenodo, and the record's metadata                                                                         |

## Checking our grading

Node 20 or later, no dependencies:

```sh
node scripts/grade.mjs data/answer-key-85.json results/85/claude-search-1.md --list
node scripts/grade-refrunner.mjs data/answer-key-85.json results/85/refrunner.jsonl --list
```

`--list` prints each reference, its true kind, and how the answer was read.
For Claude, a problem counts as found when the answer calls the reference
fabricated, retracted, or erroneous; a retraction counts only when the
answer says "retracted". References an answer never names are counted as
judged accurate (the answers say "the rest check out"). For RefRunner, a
reference is flagged when the card would not show it as a clean match: a
warning or not-found outcome, a named correction (retraction, pages,
journal, DOI), or a title match below 75%, which holds the card for review.

## Running it again

Claude: install the [`claude` CLI](https://docs.claude.com/en/docs/claude-code)
and log in, then:

```sh
node scripts/ask-claude.mjs search data/references-85.txt my-run.md   # chat | search | every
node scripts/grade.mjs data/answer-key-85.json my-run.md
```

The script runs Claude from an empty temporary folder with a neutral system
prompt ("You are Claude, a helpful AI assistant made by Anthropic.") and no
connectors, and removes `ANTHROPIC_API_KEY`, so it uses your login. Our runs
went through a flat-rate subscription; the dollar figures are the CLI's own
estimate of the same use at API prices, not what anyone paid.

RefRunner: open either list in [refrunner.com](https://www.refrunner.com)
with one link. Every card shows what was found, what was changed, and why.

- [The 16-reference list](https://www.refrunner.com/#refz=xVdLcttIEt3zFLmSpQigCIAEP9pMUJRkWZ-WxtKEP7sSkATKLFTR9aGaXnk3B_AJOqJjbjA77zRzEZ9kIgsURbktd-9mI4JgoZD56n1Sx2gqb7WK4DWD3SxJsz0G58iNEqoCrrhcOVHYfTg0YonGRlDiEqVeNKicBa5KKGouJaoKLYNXyqFR3AmtuIRT7Q196hncYFErLXW1giNVc1VguXlNBP3dvDvYi6CX9L99_tJLhwxq5xZ2v9sttWDaVN00YWme9LuvTm-OzhkVypI8HaWDzkv-399wKf7zzwgOWQSH_C70c80i2IFrgQ0qG8HLtr08tOdeWFDawUybCt3-DxoGbhD4rfYO5PpHFpq4MahKG0E-3k33IhhQwcP0x_UmybBr0zTPRnGS9uNklGXxr53vS-o9g_hNjYANmgpVgYQhh1LYQiykUMhg0qARBVdwgDVfCm24hOtCoHLCugjy4W6a7EWQ9kbJt89f0n6S_LjIdDjsJkmSDQf9LO31x6NRnm7XSCge8DmaQJFrBqcMyp9xJZACS1880KDkjkMjaNU-3Og7bkoLhW4ar0S7qOWRlpLfahPuEJXgyugCsRSqstS_qxEyVX5HsqlWMzQtRuqxnMmTcs6UvpNYVgi7iwWDLM--ff6S5f09BpPpxTPA9PNu1uslgyRl4XOQds64VViICI5YBNdorSRczlgEZ_dfixobrtbUO-BKoXERXBAnCU0ncMlbjh4LW9T05DGL4CW3lq7_QddG1y3oL--_KrW138n9VynRNChoLb3-zHjapf35zLuVEnrePnwhipqjFBHcsAh-QVOijGDKIria4WxGO5zSF_3Ro4vgkprhIvRC5V4XdSNKF8EkdCnC07TTt8__gg0ELX0zou-05u7l1Q3pCSqty7_BpQK9WGjjvBJO4PdOQccpuakQJFeV5xVCo0uUNmyxIc8TetHBl2IpSs8lHIrZ-tRtBGnSoz9ZNuw_I8R00P3ApFClmDGqmbWrO9vEJqKf8DtFbYfOiN4TWWkjXN2IAm4FtyDUdnnP-t3EODETheAyrJFStDIWCo4eHo-gl-32SaNJ4GOajLOfGEk_yce9OMnSOEmyUR6PO2-Deb6hQ9J09Y5FcC58BO-Jcz6CExbB-9q3a3bgXBAJQm-DPSp-idaJijsCWCjrjC-cNgHrBaLZ3Gvbu22NxpuAAl8foFbkR8GavLUk5pk2vgFvaVeHzSJYU7lSnEDc2ATbhuuPsiXn2s32IhgNAzTPnOxokIy6HySnUx2wcdbLO2fciEYv1-zl3KDkLa_fCkWnfc4ieIOihek9b24NVzqc-nEQruFq1T79lB6XhW8W3Fd1q54L3jS81KTpoMD73818fv-7UKhatezA1f2_Zak_cDqJDexTo62NC-2VMysoH4lMqDrk5Az2BXgbTF_-wV__KnBplgfjH_wl5NJh3nnDiUWnofRjrog2oWoKzZBGsxkWjl77IHitwDpf0izw4rHUBZqZNg2lfPTkboGLlvjEsFpUNZpYmxINuFqoeQiIV8qKqnYWZkY3wKFBx-PQvBWWwYlv-JalXOugsRB8BOF0O1YIiyyCQfZcPuckqzQfj-Mky-OkPxwN41Xnuqbe_06E8a2o3nmrZzO6DjzagQvvuBS3gTSTR5COjs_BqzAoCbfaggYbvRYRqopXIQ7ouCev4gZLwR2Wj0AVWjn81dl9mICl3AirHyE4MMIJWz8aCZfwGi1yU9QP3HjOR7LuLZoPrJ-Oe51zocqPyzAttF1dzvlMm41HUDrePOh3QVls7TrHiQMW5Sw2WHn5tHxn-JrMF5eX09BF46UTMbmJcD4EPkGz-nMmp4HJfSLyoPfnPO6zUdZLOydo1P1vqsRP8WsvPkVwxSKY1qTL89Do5Da4dr0i6W5S7MpgKQonlghLLkVJR0iFXVxDIUUxt84gb2CG3HmD66jiRq7iu3XpdmUdNm3LT2k71c3COzQWdrYDIB2PyP77w0HGOhcENOXZYVtT-uPxSihYGF44UeA-HLk6IFVyW99qmqxacW1hzSUFr6qQwWvtXRiD2Frrb4OPYclbnu-QsOn-CYtPHmkdikDTRrRswwJ4yRcBK4w3R_9c_2F6o_8AxEe_Fq72rtANPg9NluUhGdNRn3XOxCchCyyCFx-3YYa4sdX_S1J3JsUcyeVsOwEe8Pn8YYJacgXnWodZIr4IwxqXDzKb8mbxZHx6p72qWgEF6yezWK5fvK2yh0l5y18DG9BY6kp82pLhT3AdtH0ko58NS4VuFlj6VlW0fJT8Dw): anyone can check all 16, no account
  needed.
- [The 85-reference list](https://www.refrunner.com/#refz=rXxLbyNJtt6evyK8qZEAMpUPPrUxKOpZepRaVHd198YIZh4yo5gZwY7IpIpa1cKAVwYGGMDAADO-MHA3dzfGwLMw7q56_kj9EvuciEwmVWJ52phFt0pSkoqI8_rOd77geJZA9oHPQLfZpcfGHjsI_TA49Ni4LFTOCxGzseYzEbNpqnTBxtI8gTZsGist5IJ9b_D_N0ouwBRsovJcSTYtZwZ-KUHGwLhMqnd4r3RyB4XHrs7Oztg4jsGYNhu12aDfjaIvn_4w6He7PY-lRbEyx0dHiRKe0oujwPeCwB8dcXqFhwv0In8Ydv1ha7xclLLNpl6bvWEXGkCm6qnNJo2N6ELMRSx4xoQsIMvEghYmJIOkjHkhlDxm4yTRYGgzUKQi5hmLU55lgBvDZ687QcgMFIWQC-Ox8RXt7AyfNW0WHkSHbdaNgi-f_tDt-q_vwfcHR6Yb9YdBxw-Dju_7o35n0BpnG55uuGyzM9rF6ed___u_FLD4_DfdZqd2I_6hx-41JCLGv894zBPIRcxMSWeCC0zFIgXd3FMmCtC8KDUwDWsBT7TkGRpqpXlciBiMx65kAVrSS3jG3qpS41c1Z2fVO_GMPUKcSpWpxQb_1KX9U_UDbRYMDoLDNp11nAGLvNZYJhqeTJu99dhb2tcDX61oQ3e0p6B36LETkDAXhWmzWBn8gitsHLyas1hlGZ8pTX-JzZVmGXAt6RhkwnLIld547FFzabJqvVfGlNZu92YTp7hysuk0Fmj8NgsOwsM2C4bhl09_CEaB1xrrGWRcFM9t9s5rs4tS67L4yBe8za68NrstFyXoZ96mzdx__jcNz7S3W9rbPWgl6VHaWoR-Jxl8LEAasQYWq3zFcQtrYKYokw3tLCtNAZqteSYSUeDRJtYm97xAo7AHiNVCCnvG3T6dcdjFUAl7_T1OFvSPPngrXsRq4YV-EHr-wPPDoDXWSkmjRc41X6rCxswNF6tU8-WK523ayiTlRSpWKT5w77XZlINcGC7sd2_YveZGC3wx-WV46LF3MhMStlbZjZvHlIsMDYX_mULzAhYCDCsUU2vQscqBFSk0XzXXKqef4UmBLMyXT39kK9BmBTGeoPG2rkdveyXnSuf2-9pTBWBcDg8Gh202DHp4aMNg8K3QDPx-NOr4YdgJgl7kd_qtE66XmBofrVl9a1aXGiFh5wDJjMdLNt2YAnJ2wg0kTEk2TviKjP0IBiP2mJ2hLyR4PrizW5VA9q3Yy0Ev8OHmdvA4b6pTPhBvzx4P26xnHTl4dV_RaBQciQ9QeOueCL0gjHqtk89_nX3-K1qb3XgYjg9odp6vlGmzczR5oRVk0GY_eG12ytcicY7O7rw2O9EUEw_kDY9Ka5AFHdDj1iNsUZiCLEQOEosGzzZGkNGv0KJivmFTa1x2liu3_2nBC8BnxmslEnaq1UqVBe76rFPt-xtndipMwTGzb53jhTP4FECYo8Puq-fV9YPhkfiQQOFFfi-MBq0TzbG-_EDbnWToD_gdbtXv11stUrC1klc7FZKtqsyz8dh3Jc9EYeP_AQxwHac72WnTZhFZcjDAjOS_bs8gGAVHQXcw9IfDgd__ZeX3I8VbJxqkxAJys60Wp7zgHUGBAQkrgMcp-eHY5X48H9C_M2xRioROvZFWebYpRGw89oivw3o_UVkGC8AiZIzXmvBM_P0_m6VA0-PRXHLNZ9zYnHgQjAYjjBWWgEy0KIDlUKQqofRdpb3qrDyCDaUU1mh0dugKwhRUW6Ot1QZeazK-uzk7uTk7-fUvk1__YpPW6fimzca0jrOH0_Gv_528G0-ie-ixszXPSusPak7Rdw-aEgY6i5qzG64XwG64XJR84WLTsANMhRf3j53I69m8iN902-ykKj0nXCeHlONKvRQmZe9WaZHyLLeFcpIKmHfGxpBfFuzsI88NGmDSKAYYBVi98B02wK4zIcUyAy2anr3zvm0WRYQ2gj7mtH0prRdF_SNlX4iQqdsJ_LAfha0JFEKK2KKNG7HCfz46-LTAb2xqD4aHHjsXEjpFSV4xUXKtstLF3R2Umr4UT0ovDRl2jmWA64LFGTcGQRedusfOPq5AFy5JGvYkipSNV6ussjjmry7-zyfnD4Kh15qkSthie811mc-44GmF8255wTfKpMJ6W-iHfcISG_V_8c2XT386ETYPa3anii-f_nzMHiATfJYBOzOFyGtnGGcLpUWRIpTCF-1k2PE2DBq2-PrXbRbY0A26tPz-Hgg77PvDow8ZR2v0vZHvB62JSiWC1Ta7LAsMUNOmJHsDlU1OhHnips0utv48RmcUsqPmncdUlYu0YPda5StChuPVSisep_aQb25urWmqGMC03Ciq57ZsroGNjQFjKFs_gFkpaWy9cYAJ0aeKAbCAmSqMxuPxFbrFHDQhaqx7W7B91QDbbRYND0JCL5HFXGEUjHyvNVFykUGB8GbsuaLywD9wjXjEOSKC-McUAfs8sz2Fmm-TlU0sBv_4DlI8ZvdaKM00rIBqtYZCC1jzjIFMMfRN40dKL7gUzw7N8pnKhEnBNN9yjStIxcyhMUwAK61yVYBhK2WKzu6zFS5tFnUMA6qIPGtk_mN2ARI0z9CD_IMuFvWo9-XTH3q9PVXAjwZH3PfDbuQPW6dfPv3xFrJMOUQHaY6l4ARhKiw1Vq8HF94cjEE4Y9u8AJ0JzVcaDIeYSzYDNiNEThZsYm1v6_gWcZlCl7E9inDUZhZg7cdXhErdm9FLHTbteb4ftU45ewAsX212oiS6Tb1o0MrwaskhAuut0z6WBXWhmFTvtVpontOi0TnP8pV6Ak0ejWcvF0IC6GYEuEaUOgce29qjZLOt6fdtYLtMG3mtU8h4rJX4WJWYAAvdLXBT0nvvOsFSqqcMkgU2ANsTw7hSFjQnwsSlwfNvgtrdhqvGC3jwp7CGTK1yQl39AXlL4IcBgYbu66jGodugG0YdPxh1_FG_H3Y-tk4Rbme2cl5AqjMQzlnOQUtETKf4m89_05mIXfK95aVGF6IuKMUovfTYJT6m1ed_ybmUmKuoEgsD2v7gjnDmYmvCV-HQrYtktOCrJfkYvTUpbQs8hVx0pnSkpYbEwkJscl19cQXbFurxwylaFgtvidDDZbXtiXvbHoISug3DwfB1VB2N_COxfT7w_a7vD4atU8HuucJIJGTdZu9TUYCNxYvy879JITsTrrOysIc-QafgsqjAC-HL2tcp18cu8VQ5dqFs72TiVKnsmFxd5CuliwrNcPuSOkEKSQ_hMWLepIPNqoPN6WA9dp-KTBm1sszHbkTYZP-gNgjRVSyg2LCTY3YiXnbViNUGo4NgFDS5ADS5H3RfP8rAHw2PtClmWBQjD59rnYplDrLtOuuTUmNVnGy7C6wFMJ9DXNDiEpVzIRuhpiQrdGmocYCPq4wLSaXfUTYFN0vsJisEiMkj5oZOZwWgO4Xq4FeW2X7tGx3HZZlz2dl6VVEm1GgE_ZCicjAKv5UOxYc0Jjor9OzDrVP1bIPuHLKE23--YRNViF__a41p8QxsuX5Zzm951YjwjF3XB0LxcF4-P2_YDVqs2T5vTReE5PNhv--1zrI7vuTWLe845gjkRMZzMRdtivY3bJpyzedtR-Y4po0jLQjH7Equse9dWMRRAYqObY9f4RMrOtHBjETwr2IVyZoRNvSEHkb7KqNlP7SKHU-IBWYUtM7yGegMNhRcE-I5EF6eepTU3ossEzw3Fei6UaWg455sU1azgJhSr8VaaXNcHz97ShVxFMIg2ChSjchsS9TNuchKDbtYsvmeTTItcC2P3eq-nB4efQDwQr_X77bOtIiNwRdfey6ZTEWO3ztWNxiNENBfqifMHtR1sMdUyKVLEWdr0JuEb9iNmAMl2kJzoi7sY51xpsoEzVOoWGWGvUenOgUTa7GyiYL4UIw3yevMUf0Jj90KmbTZpMwwXVv4RMlNFBskMaihGQyxjA33MFshVbFeFA6Gw24ec7_nR_8pap0j2vnJa7NHLhcWQyB8Ri-dpkAnQr-z9evnlCv7uP3lT9QEtdmPFm3wv_8PWItf_0tNvHapsXjimvJDDgV3jBymWP4sJBhzzM626WhBWI5-z_cwz0o24KsqxNrZHd0WEZqjQRs5ymMnWhTYYv4_-dk261nQ0h2OEENGvtc6RzCrqYm4oBpeFClxsw-Vs1yI2YwasbFX4RpsqRzaqFCf2AlrrAqlzZuYiTLoCOTAcsJCtntowmqeMe1K_U4QvIvjclU9cQk8K9IdWiQMKBiI9Iy-iYejURCNWhdcJ7KCKG_YiVZqWRcQ6mor5qkiz1eOWLfI7Pbdu4lBYge0xR3V7vEnHSL2KrjBKwA8tDAxxP4v9Pet0qKwsDfo-MGwMwr9qPPcukiVqRvbc47dqctLVf9DbA4YsaCWlTf5xzNj-AaBPRGLB-Ozi8OKihSSXclEcEmxDB-Lb9SxOte-aMoPqJAPMA0NBl7rQi1UZuPpRJeSDhmL9IUCpM0fybV0UYHI7xfggu4asgwf_h4rmzBxOuOIJ8eOUYZ4iSXmfNuVfPn0p9sN-65Eb1NScqGBCcMelaJR03_48unPBAN43bVS7G2DiWcdTjFpyXeHvR00LFINzlmJlH7FeT17agisuN7shNoOZTeyiWs4JMP3vNZFWQjQNBxALvVUla6gi3iJfbwtNznPqGHY1DX-Z4XJ63IbemOWbmZaIJtc0F_rzKh6igbXDR8L54PMkNV3AqvJitdFtBse9NGmI1zxMNzTrgWDwZEf9Hu9XtALen1EaaPWpZDqAzVjxLmBXlFXgNORcTbnWtlfPJSAmPeUWGWtYl4Z-oKASU1lhId1tc8FyEKxBFGqLlc8Fp__KvFbwAmA4BJ7bAOLz_9bMi3ALOyzMy4TJRVDMo3l8AFtxTLOcBRJ71C_XGDTb0dj9r1Nia240shwfiwUuxFrrEpBr80gGoSDnte6VPN5o5yecJMKXXd96KWPFcqsZqXIOmCQLbTNkGf5SmgCY2drkVS5_5zHhdIGJyMFGsmRGvRunsWU1TPH5OUNm2LO3XnCVl29UFLlIjYVQG-z3sCOJIlS60Z7OkMytB8MB6E_DLq97qA38FtXay7VmrsBUJzmIikqaDTO1py8-2FbH8-5wHbRMF4mwkZilVLXVYvx2oSS8SQXVfP7WwpczxU49OGeP_Bab6n0_1TjOoyyt6WNKFz1tcir4CK_O-M62zTzPtYwVxUSN3Yo7TC40UDkxKFDgxP5h8dQg4MRFYhhD4mdIBwOR7hqrXlqkebltjztG1hT85ICm5c00lVzhtTrsetCxlfMbPKZUG768KL0JhALonlybvHYCe4PjXaptHimfN8PLPlEI4jesI8rXIuEW3Lu3vICIlFKOtr_QulESYu53rCJ5k9zpRMi7sZf8-8OMqyQqAEyO9Wzb-z21WYVN5ej4dAUFc5uzlfrGQxWti2HT-9Y0_j4LhVUkwu25iYuM64R2i9Ab5iGWOU5yMQWQ4-9_WHa-aF66koasUhxXk2Nnu93R17rmqcObb5h73Ev2uy0R5MGBSSMrT3jK2w_U2EKpTcW9SljBHqbNfNvjAyrQwiCyCcivbun_wyC4GiGY8Eg8ofD1jXXIldrm6innGvIXJb_UVCVRwO_B9FmPyOE5vlMc6nIK7DInXDN5ca--oTTwPTBNlbv4jJf8XKRWjR2y_OcJ5RaCBZ8_le9XH7-VyERKNj8cv_5f2WJ-sDrcMVaONHKmM5ElbLQG3Yq5o4NsQNmN6LCBvh7C0e_5uiPa5PZ6fK5kDiUbuM8QEnBXUPyDHrGxQcu_2HKP6R47u5pWV5Q_sGg17oW2sQpnSqe3T3nbuza-MV9VXTecmkMHs7brWSi2n6BIdPgQVZazTLIO0Zla1xsAjmXlhhHXcFaJCXPrL5ih6OsWxFVFjiNN9-kel2KGFKKGO3rTV9lewPPDzycelwr_byRNDy8J694LjUsLW94rZ83q6V6MkteSQ6uS82NsM83aOB9aXJFsxAGjd6aG8aZhCeWiIVA8h3TBRRg2Z9Gumg0b-MrVjRn76ZEBtZUGQQJgULDSoOEUuMi6oRKFTmuCvIDKW8wJik0yV-iwevn1usPhkcwA23ZsCDwIz9s3QCPVby0c6I3WOESpVHkZKGIj4cx6aCwQh83eoNKoaXmlmrpOKqlQtV27kq439S1hWqJKITl8sjWEfWRXQS3NwDkihayTvG76yrV-3sRke1dcCnI7NKAaqUFjvppKkft7T8L9TiNTA_T39D3WjfCZZZrzTk2KTj0vKT8Q3Dh0ghIXReDQ0sandwS67VY4UTmljJilvEEqpHENBWyFsBgYp-mnFpkGntqpXJmFPkl0MDHZqptpWoGn8l5ln359PuFVuVqdxqwJ903249RaHkikp0Fva7XugWtRUHiHlr6JYh8ZhPwJcl9JilfQZZV3TFZ1FIdAQKjK2fCq6LNZmXBrtipkl8-_bEgOpG9Tzc7ZMdVjv2iKNi4KATiJ-zRnrhOGg6ACaj2i53udep6ln8a5LU0Ui_0ifj4RyBv2O33_GHQuoWNpQwoCX2vZ1yqJxFbnPu20djeEymIM9p3Xz79caKkVNoW_Rs3s7oHxJ33XmdCfTIWHdLHvCUaqlASNYR2zPveEXZvCUvJZ57Bc-cSe3SZIMa2g5RbpbSNu8tt9muON_bCJMc-8mOmVjgiKG1ovxDZeUjlo1wEOTqBiw_6B7sM_p6THPaPTBD5Xb_j42jJj6JRZ9S6Rb2Xm0bexheaS7v6sfO4asA33e7m5tUd1Et8AXtf9hEeu7Mqx1sH0HdHzz2bxkhhGu3zCj8aHpluGPb6bi_9brcT4l6yhgAMZ30NipPO-PUy9BJwkJzNZgXjKHdv_7Q87A-s4iXaNzahCks-WWBtHZLKzx-0bsVzmatC1XqYRRm7FqNmsj-uMlsaCI6rwmEJNXc9Dwbp1QtrUO7mdegCEU-mYu2_muFhCUAuCRJ2I-SirLQ8oUVNvu_3vjkp1rlVrUSefbZ1q1KOQqY7Pi-1qKHnlEuKJcvtciHLRNiB47l1uAdux-FjzzLhtocV2No3xikTK0mqMR7CAdzwxApZNo1BCxtXlH5TRfSKKNarT2BnxhJgIzjq9l-HADRa5KtVEAYjfKiFc5i81LzqZHEwVNTdd7gVakPCDJV5bsu8s41jvHCgR1IwzUAayGfZN6W_exyTBgXbOUVku41-gJ7a_7bq2e-NIqd6DgdBJ2jdiVhlNhXeeiypZi0UYoiZjKg7xkchC_U7JExAabDTrUoc6ISULw9_O4sbuZrwukiqF42OUjDeeiSjVS9svVsquXyyrc2dVaMAqqhroVFQZQDHCVRswS6HPMPZISDSLjUKaWxcLZCnBVl0ZkrZKZEG2IFhb3Y11eE2Bwd-N-wPvdbn__acYEOAEOynX_9nlvPnNvv1LxaYfP6bzLFuuMyK3YIt1pYcLTNux6Oy1LSgSl_7OwYyUcglpoAJyvWoctGYqhJTuhQZTovvcFeNw0YhoxOUt9kwatvVfnP2KWFFKLfn2Wdb93zFE74UZgdaIRa4ylfcbmGiEqdxohn4tKSqxn5SJerTUpElGmg19kTrDrmacxEDsPOrcyLfNki33mzV8haze-xcK4l0rnnh-P2tXfq9wXDU81r3Til8Y2lPcpmJFa9xIn4x9dyolZPfWPQ1Vcsl1zsDf-TyS8TGrnEiwCP5ujl0GV9hTaGVWbSkVQYNtuM1ru0l2N8a790K7JYC3w_631SVxxwUaQk9-2zrHiU2pBMhYH1mYoXN6aaerL5hpyU2UU_Uvd0ii1Q3sj-g7N3u6uVEw_UuyI0cYISb4pA9AOoLKz0PnsOXT3-6UFmCYlGZcJ18-fTnbdK1khz7_K71qmmN5Uj2UST-0D_yh6PeIOoOsMLSnsORH7buzQZZsNI2B_canpGuwGr0qPRq5ZiTG9DLJZdWyNBBgHivxHIJJflCx4obfuCGZzxfCYKBlQ_cvuAZq-RiWLlaYWqHWOGGNw0qtcpD3DAgcpMbOiOQiSUHUPe_cbIRz5YkyvHsATCIsDh1d1BfEI723jEgsBT0RsMOCkv7UT8cdfzWd1h6zx0UtjzYT7wmL0iV_L1MQKPmhQK5xBlbrdXYg6S-fPq9nXxAowuy4w6cvFbEOqGsSSok_22MWXDQI4XXyEq8At9rfVcKSW2jJcBB8gRAO7u-5bGauUHORC3SjNfXj25qaTjt1TY99o5KQkUL2b4Xdx2egM15g9yllrEQBpgEwBLy4p7E7oiHskEOOGOQ7Nb9lYaSCXUiCDprx0ckPBxRdzzah4RH0dEHngt-pGLOw_6w9cBTnokKUY6XaabKuQ3nBh9zJhOUzpzJxOqHLNxwmo_buifBeUvJM_fzuxvkuq7azPper0u0pe-1GiJQd78GhOade264Flbpfr8dj052mupbkl6iiKGa1O9I6AhGbDx8z_pGCVbFPTeFejQw63eRBen3I6_1oNZCOwrzvgRdYHq3V7euFiWSBlaGHwwqGX6ixRqqGR1a1AX0Vh6C0MA1Zi6SPXZ_827K3t2dEWzEjAV-MEAVhNea4vzwy6ff34sspk6L_dzwOysJczXTqZ60minyCJwV1mX_K-4PM65dJl1n0K4Q_n8E1NC3Yo6wR8uFlI0zPktKFE087_YjJuYrLGIqN1vObWNZuydOV6Wq-wssryVOVgZXp0Kb2eq9_aYrQoFP9aDbQxsHUXf4TR2luyUUdYJgEI46QWuK_LNlvdtsKpJE_GLzIF6QkQmUW_hIzQaXdj-OtP6alGxInZvnEcewKqp2Y63q468T439sFHnsSIg1OYGUrwWyFEFE04oBSbymcUpd0GljKlafGBF1V20mVUFoQzWgtYUcDw5y7J6yvQ6Jf_uuWtz4it2rTMR44ae6_PXP6jx6JLjo9b8luNjtPPxO2LLCn0YHhfvZ4mS7NMDLrHpVmi0Z7rqKSmz3lq-4BAPbB25r-YGN5PoX9s1f4MkmkRc0kP6g3-_3X--lomg4OpqvzGZhxW320dZWyXRZUcUIQ88ywY0l-i4Bz5JABjYODyAWVpU6TUW65Zk29Q2ilxTTuwLR5OsXZcYaUOcwy6CDnULCpk9KJ8ZjDzwRlVDCH1AKqzYJqAndZ7egOzzS9FrPPtaapqqcuzb-axqjaZV70Bgllf7M7YF81t1mrvp73Na5yjL11Pl-xaalXsPmxdXkIED6e-gTZz8cBnvImN27yZEXhf1hGHZbUyEr4vWRb3BIJjp3VNcsKLx0EOkXpWZ7GJqvFMuv7_UF-H_ZDWNWr6V6a3B9kMYxX90sb_aoQiOaXI_2XJgjvgLzj4lFEPkjf4T7LlRZgJyVekG16Zr6IBR8W288eyKW0SLES0FK85tad4YlbBpzK7vKxEJWkN_SnE4O8-0sciJUQ5-9W_53NU59N-PYk_F7fvdIfJhpnOAFvudHfRxgPfLMoEzr2uojPv_7s4umOH3i-rkqBW_YndIaO9rr7XT_is0gE7CGNqI3DXOlgV0xLG-wBnaAS1yLGNgatOGHaDpUHXaqS3kspmFoxhcYapiCsp2Jt4Fs3oE5Xr6K7US5Bhk7gsIXM756QNiYriK1gx7Qp-nCt2924Ihxjoc08GjQ12s9pkqjD2zsOd3yTCwrOPfeJqza4R_KmRZxh8wNrxPabF7dtcVaoxcl3aMhdyYykqCLRkVQLp4hYXMBGTIsgmf_0CwlCCzQG5HqdoSyye-zjKcO5tIEQJR5PVk5gYX7zsLiU4Gd312l2gvdXWFe3TBzjUB9C9LUt2Nr65XVXVKGej16AaCkLab7CZNHzAuaEpPz2h6Wv2hPsahE5nGBIuHQtwxx1PoBcM6M6rjM1olpnJZL_iHDkeKU7v_yWj35A5fsFOcPss3ebzeGn-RQDZytIKMByxqfQMBJKo159efTW5InVFc5g32tpRVJDnvYWvodH6UMnW7rPQl83jqR5HYxvZ37AM002MC5mCu3vfQ2CNo7P3Wp1CoBLH3SUTrBDtXxR8dIyjQ4fd6ITLrHup2e0ptMLd9fJdMX11wtG9yoif1wn6i9N7DtNsLOXsfvDoaDzsadic2iP6dOAbXtAtQKRfZf38EWsrqxX6cAt7Bi47pod9d3e0-qecsaB0UvEXWjWQpp1oK90uu7CbuD4dGHRJhOSAb2_ZHbCfKtP5ZOwS2oJPxEm7M_ZD9uP1vByWFpGfkqA5cL1AuFLB6Ao8Gn5eyDk4NWA_CvLu2f2psk75zg0mPjZI1-kqBiGjCTbEtJmw16UWfQ6yG2ibBviPw9VFLXD4dHT09PnqlJF09CccRz7bk38fA93DH85HXOaTJdNkFCCZ1zkAtmn7ndev8Fz8UcCa9czUS2JY2O6QMotq0Vkg7FTBXYNbkLkDUvUYDORd1l_FIS-Y5Jx8mxt8DAOUKbDbuWRBtQxz7ch4zsrHUwHPVHYTeIgqjbDVvvUWFTKHfDgrbn1K-d6ZYFm6h8RvNIdsIzLmP8FzqfAZsa0bXR6Rpkg_2AgXylFd6sbt4vqSTS980S-Mp8pmslz91e9Lot6_lMNwjwodb26siDQ3P5SmVmKTZ1ixF8xXsRDMHPOCDu8woFlHQ5xN5jJCKdZ-wCL-Y3r2ZRRbaNT-S1fkTV0nckeRQlsVXXdiZGM32rW5ClEfShJI_0UQ6i7SIKLxCTJL7xMR5jCx0SsN5g7V0QV8IOpqePhyxxUVddMcYyJiRe569AZSIQtey_-XAwvjp8nZPenXzgTZ_A7_aGIe4TfeM97kdVKs8b3DFq0U5Li69_Tkv7zBtKHZOtdmz3KtJVzarTeu_xnldD4IQyHtsul7ZJ467ncRnztBZo4C3UMncf__BoheIZO91InldNxm-5Oj60n_qwB4W-kJGFUe__AA): visitors get the first 20 checked and a
  free account 50; all 85 need a paid plan.

The links carry the list itself (compressed, after the `#`), so nothing is
uploaded. `results/*/refrunner.jsonl` came from a batch script in RefRunner's
private codebase that runs the same lookup; compare its lines with the cards.

Retractions change over time. A paper retracted after October 24, 2026 is
not in the answer key, and a model trained after that date will know about
these six.

## Caveats

- We make RefRunner, and we wrote this test. Everything is here so that you
  do not have to take our word for it.
- The answer key comes from Crossref, which is also RefRunner's main source.
  Where Crossref is wrong, RefRunner agrees with it: #30's pages are 60–65
  in the printed PDF, but the answer key, like Crossref, says 72–77.
- One model (Claude Opus 5.5), one month (October 2026). Three runs of each
  search setup; plain chat ran once on the 85-reference list (three times on
  the 16).

## License

MIT. See `LICENSE`.
