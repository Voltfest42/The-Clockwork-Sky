# Draft: asking ATNF to use the Pulsar Catalogue's data

*Drafted in Stage 23 (10 Nov 2026), for you to send. The catalogue's page (https://www.atnf.csiro.au/research/pulsar/psrcat/) gives the maintainers' contact address; check it there rather than relying on an old one. Fill in the bracketed parts. If they say yes, Stage 23's Figure 26.4 can take the catalogue in place of its sixty famous pulsars without other changes (`src/data/pulsars.ts`, `PULSAR_SET`); see the master plan's Status.*

---

**Subject:** Permission to use ATNF Pulsar Catalogue data in a free online astronomy course

Dear ATNF Pulsar Catalogue team,

I am writing to ask whether we may use a small extract of the ATNF Pulsar Catalogue in a free online course.

*The Clockwork Sky* (https://sky.moving-parts.dev) is a free, non-commercial, self-guided course in astronomy and astrophysics, from the night sky to neutron stars and black holes. It has no advertising, no accounts and no paywall. Its chapter on neutron stars has an interactive P–Ṗ diagram: readers see where young pulsars, millisecond pulsars and magnetars sit, follow a pulsar as it slows down and crosses the death line, and spin one up again with a companion.

At the moment the diagram shows about sixty well-known pulsars, with periods and period derivatives taken from their discovery and timing papers. It would be far more instructive with the whole population. Your catalogue's page says its data remain the property of ATNF/CSIRO and are free for bona fide research purposes, and CSIRO's copyright notice asks for consent for other uses, so I would rather ask than assume.

What we would like to do:

- **Use** a compact extract built from the current catalogue release: for each pulsar, its name, P0 and P1 (or F0 and F1), and the flags that say whether it is in a binary, in a globular cluster, an AXP/SGR, an RRAT or detected only at high energies. Nothing else.
- **Ship** it as a small file (about 40 kB compressed) that is part of the course website, so that the diagram is drawn in the reader's browser. We would not offer it as a separate download, present it as a dataset, or use it for anything but this figure.
- **Credit** the catalogue on the figure itself and on the course's About page, citing Manchester, R. N., Hobbs, G. B., Teoh, A. & Hobbs, M. (2005), *AJ* 129, 1993, with the catalogue's URL and the version used (currently v[2.9.0]), in whatever wording you prefer.
- **Keep it current** by rebuilding the extract from a new release about once a year, and remove it promptly if you ever ask us to.

If you would rather we use a different subset of parameters, or link to the catalogue's own web interface as well, we are happy to do so. And if the answer is no, that's understood: the figure works with the sixty pulsars it has now.

Thank you for maintaining the catalogue; it is a wonderful resource.

With best wishes,

[Your name]
[Your role, e.g. author of *The Clockwork Sky*]
[Your contact address]
