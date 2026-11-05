# The elements' origins (share-alike)

`origins.json` holds, for each element from hydrogen to lawrencium, the shares of it in the Solar System made by each kind of source: the Big Bang, cosmic rays splitting nuclei, dying low-mass stars, exploding massive stars, exploding white dwarfs and merging neutron stars (or none, for elements with no long-lived isotope).

The shares are **Jennifer Johnson's** periodic table of the origins of the elements (Ohio State University, 2017; J. A. Johnson 2019, *Science* 363, 474), as read off her figure by C. M. G. Lee for the Wikimedia Commons file [“Nucleosynthesis periodic table.svg”](https://commons.wikimedia.org/wiki/File:Nucleosynthesis_periodic_table.svg). Johnson's figure is licensed under the [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/), and Lee's reading of it under CC BY-SA. This file is a derived work and is shared under **CC BY-SA 4.0**. It is kept in this folder, apart from the course's other files, so the licence is clear.

The shares are rounded readings of a figure that was itself drawn from models, not measurements: treat them as good to ten or twenty per cent. Chapter 23's Figure 23.3 says so, and gives Prantzos et al.'s (2020) split between the slow, rapid and p processes beside them for the elements from gallium on.

It is built by `scripts/build-origins.ts`.
