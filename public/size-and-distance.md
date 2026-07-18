If you want a **scientifically scaled** Solar System on a website, you'll quickly run into a problem:

* The **Sun is about 109× the Earth's diameter.**
* **Jupiter is 11.2× Earth's diameter.**
* **Neptune is nearly 30 AU from the Sun**, while the Moon is only **384,400 km from Earth**.

If you use one scale for everything:

* The planets become almost invisible, or
* The Solar System becomes thousands of pixels wide.

That's why professional visualizations (NASA, museums, games) usually use **two separate scales**:

1. **Size Scale** (planet diameters)
2. **Distance Scale** (orbital distances)

---

# 1. Planet Size Ratio (Earth = 1)

| Planet  | Diameter (km) |     Ratio |
| ------- | ------------: | --------: |
| Sun     |     1,392,700 | **109.2** |
| Mercury |         4,879 | **0.383** |
| Venus   |        12,104 | **0.949** |
| Earth   |        12,742 | **1.000** |
| Mars    |         6,779 | **0.532** |
| Jupiter |       139,820 | **10.97** |
| Saturn  |       116,460 |  **9.14** |
| Uranus  |        50,724 |  **3.98** |
| Neptune |        49,244 |  **3.86** |

---

# 2. Distance from the Sun (AU)

1 AU = Earth → Sun distance

| Planet  | Distance (AU) | Relative |
| ------- | ------------: | -------: |
| Mercury |          0.39 |     0.39 |
| Venus   |          0.72 |     0.72 |
| Earth   |          1.00 |     1.00 |
| Mars    |          1.52 |     1.52 |
| Jupiter |          5.20 |     5.20 |
| Saturn  |          9.58 |     9.58 |
| Uranus  |          19.2 |     19.2 |
| Neptune |         30.05 |    30.05 |

---

# 3. Major Moon Size Ratio

Compared to its parent planet.

| Planet  | Moon      | Moon Diameter | Moon/Planet |
| ------- | --------- | ------------: | ----------: |
| Earth   | Moon      |      3,475 km |   **0.273** |
| Mars    | Phobos    |         22 km |  **0.0032** |
| Mars    | Deimos    |         12 km |  **0.0018** |
| Jupiter | Io        |      3,643 km |   **0.026** |
| Jupiter | Europa    |      3,122 km |   **0.022** |
| Jupiter | Ganymede  |      5,268 km |   **0.038** |
| Jupiter | Callisto  |      4,821 km |   **0.034** |
| Saturn  | Titan     |      5,151 km |   **0.044** |
| Saturn  | Enceladus |        504 km |  **0.0043** |
| Uranus  | Titania   |      1,578 km |   **0.031** |
| Uranus  | Oberon    |      1,523 km |   **0.030** |
| Neptune | Triton    |      2,707 km |   **0.055** |

Mercury and Venus have no natural moons.

---

# 4. Moon Orbital Distance

Measured from the planet's center.

| Planet  | Moon     | Distance (km) | Planet Diameters Away |
| ------- | -------- | ------------: | --------------------: |
| Earth   | Moon     |       384,400 |              **30.2** |
| Mars    | Phobos   |         9,376 |              **1.38** |
| Mars    | Deimos   |        23,463 |              **3.46** |
| Jupiter | Io       |       421,700 |               **3.0** |
| Jupiter | Europa   |       671,100 |               **4.8** |
| Jupiter | Ganymede |     1,070,400 |              **7.65** |
| Jupiter | Callisto |     1,882,700 |              **13.5** |
| Saturn  | Titan    |     1,221,870 |              **10.5** |
| Uranus  | Titania  |       435,910 |               **8.6** |
| Uranus  | Oberon   |       583,520 |              **11.5** |
| Neptune | Triton   |       354,759 |               **7.2** |

---

# Recommended Scale for a 3D Website

For an interactive portfolio or landing page, a **realistic but visually balanced** scale works much better than strict scientific scaling.

## Planet Sizes

| Object  | Diameter (units) |
| ------- | ---------------: |
| Sun     |              100 |
| Mercury |             0.35 |
| Venus   |             0.87 |
| Earth   |             0.92 |
| Mars    |             0.49 |
| Jupiter |               10 |
| Saturn  |              8.5 |
| Uranus  |              3.7 |
| Neptune |              3.6 |

---

## Distances from the Sun

| Planet  | Distance (units) |
| ------- | ---------------: |
| Mercury |               25 |
| Venus   |               35 |
| Earth   |               50 |
| Mars    |               70 |
| Jupiter |              140 |
| Saturn  |              210 |
| Uranus  |              290 |
| Neptune |              360 |

---

## Moon Sizes

| Planet   | Moon Size |
| -------- | --------: |
| Earth    |      0.25 |
| Phobos   |      0.02 |
| Deimos   |     0.015 |
| Io       |      0.22 |
| Europa   |      0.20 |
| Ganymede |      0.34 |
| Callisto |      0.31 |
| Titan    |      0.38 |
| Triton   |      0.22 |

---

## Moon Distances

| Planet   | Distance |
| -------- | -------: |
| Moon     |        4 |
| Phobos   |      1.5 |
| Deimos   |      2.5 |
| Io       |        6 |
| Europa   |        8 |
| Ganymede |       11 |
| Callisto |       16 |
| Titan    |       15 |
| Triton   |        9 |

## Recommendation

If you're building this with **Three.js** or **React Three Fiber**, use:

* **Real planet diameter ratios** (scaled down uniformly).
* **Compressed orbital distances** (e.g., logarithmic or custom spacing) so all planets remain visible.
* **Real moon-to-planet size ratios**, with slightly enlarged moons if needed for visibility.
* **Real orbital speed ratios** but increase all speeds by a common multiplier so users can see motion without waiting days or years.

This approach is the standard used in most interactive 3D Solar System visualizations because it preserves relative proportions while keeping the scene usable and visually engaging.
