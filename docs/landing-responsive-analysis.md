# Landing responsive reference analysis

Source: Figma file `1IYFuZT7Ccskm5wSKSHUMa`, comparison node `858:2070`.

The eight `landing_*` frames are reference states of one page. The implementation therefore keeps one `MainPage` DOM and changes presentation only at the named boundaries.

## Frame and section matrix

| Reference | Figma node | Page height | Section 1 | Section 2 | Section 3 | Section 4 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1920 | `857:1858` | 3970.161 | 833 | 855.161 | 1073 | 1197 |
| 1280 | `857:463` | 3677.669 | 833 | 755.801 | 988.344 | 1084.525 |
| 1062 | `857:672` | 3453.669 | 729 | 715.801 | 948.344 | 1044.525 |
| 1024 | `857:1079` | 4078.340 | 729 | 940.887 | 1463.400 | 945.053 |
| 768 | `857:878` | 3792.148 | 546.750 | 904.945 | 1483.400 | 857.053 |
| 640 | `857:1281` | 3383.977 | 457.482 | 752.664 | 1413.131 | 760.700 |
| 480 | `857:1482` | 3074.921 | 343.111 | 661.319 | 1377.157 | 693.333 |
| 360 | `857:1670` | 2670.482 | 310 | 531.654 | 1250.492 | 578.336 |

The small differences between summed section heights and page height are Figma canvas separators (0–4px), not web content gaps.

## Section 1 — Hero

| Reference | Node | Height | Title | Alignment | Background |
| --- | --- | ---: | ---: | --- | --- |
| 1920 | `857:1859` | 833 | 67.31 | parent flex center | cover, centered |
| 1280 | `857:464` | 833 | 67.31 | parent flex center | cover, centered |
| 1062 | `857:673` | 729 | 60 | parent flex center | cover, centered |
| 1024 | `857:1080` | 729 | 60 | parent flex center | cover, centered |
| 768 | `857:879` | 546.75 | 45 | parent flex center | cover, centered |
| 640 | `857:1282` | 457.482 | 38 | parent flex center | cover, centered |
| 480 | `857:1483` | 343.111 | 30 | parent flex center | cover, centered |
| 360 | `857:1671` | 310 | 24 | parent flex center | image height 100%, width 198.38%, left -44.42% |

Contract: parent is a centered flex container with fixed reference height; title is a normal-flow child and always has two lines. The background is the only absolute overlay.

## Section 2 — Trust / certificates

| Reference | Outer padding | Main layout | Text width | Certificate width / height | Main gap |
| --- | ---: | --- | ---: | --- | ---: |
| 1920 | 200 | row, centered | 387 | 737.29 / 326.36 | 58 |
| 1280 | 160 | row, centered | 294 | 583.125 / 265.086 | 58 |
| 1062 | 140 | row, centered | 294 | 583.125 / 265.086 | 58 |
| 1024 | 140 | wrapped column, centered | 708 | 583.125 / 265.086 | 70 vertical |
| 768 | 120 | column, centered | 560 | 570.88 / 255.144 | 80 |
| 640 | 110 | column, centered | 420 | 420 / 180.671 | 66.664 |
| 480 | 100 | column, centered | 320 | 320 / 137.654 | 55 |
| 360 | 60 | column, centered | 320 | 320 / 137.654 | 45 |

Contract: certificates remain one three-column row at every reference. At 1024 and below the text block moves above it; no child coordinate positioning is required.

## Section 3 — Services

| Reference | Outer padding | Heading width | Cards | Card/image width | Card-stack gap | Section gap |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| 1920 | 200 | 621.979 | 3 columns | ~385 / 214.838 | 13 horizontal | 100 |
| 1280 | 160 | 621.979 | 3 columns | ~304 / 170 | 10.27 horizontal | 90 |
| 1062 | 140 | 621.979 | 3 columns | ~304 / 170 | 10.27 horizontal | 90 |
| 1024 | 140 | 708 | 1 column | 363 / 170 | 8 | 80 |
| 768 | 120 | 560 | 1 column | 363 / 170 | 40 | 80 |
| 640 | 110 | 420 | 1 column | 363 / 170 | 40 | 60 |
| 480 | 100 | 320 | 1 column | 320 / 170 | 30 | 55 |
| 360 | 60 | 320 | 1 column | 320 / 170 | 30 | 45 |

Contract: cards are normal-flow grid/flex children. The structural switch is exactly three columns to one column at 1024; image masks/crops may be internal overlays, but cards themselves are not absolutely positioned.

## Section 4 — Clients

| Reference | Outer padding | Heading width | Logo rail | Rail gap / padding | Section gap |
| --- | ---: | ---: | --- | --- | ---: |
| 1920 | 200 | 650 | 1182 × 416.785 | 238 / 30 | 100 |
| 1280 | 160 | 650 | 934 × 371.72 | 188.064 / 23.706 | 100 |
| 1062 | 140 | 650 | 934 × 371.72 | 188.064 / 23.706 | 100 |
| 1024 | 140 | 708 | 708 × 278.653 | 142.558 / 17.97 | 84 |
| 768 | 100 | 559 | 600 × 278.653 | 80 / 17.97 | 84 |
| 640 | 110 | 420 | 420 × 187.206 | 40 / 14.974 | 69.997 |
| 480 | 100 | 320 | 320 × 166.837 | 26 / 12.129 | 55 |
| 360 | 60 | 320 | 320 × 166.837 | 26 / 12.129 | 45 |

Contract: heading, logo rail, and link remain normal-flow vertical siblings. Each logo is centered by its rail/slot parent. The top/bottom rules belong to the rail parent.

## Breakpoint mapping

| CSS range | Reference state |
| --- | --- |
| `min-width: 1281px` | 1920 |
| `1063px–1280px` | 1280 |
| `1025px–1062px` | 1062 |
| `769px–1024px` | 1024 |
| `641px–768px` | 768 |
| `481px–640px` | 640 |
| `361px–480px` | 480 |
| `max-width: 360px` | 360 |

No viewport interpolation or `clamp()` is used for these landing-page reference values.
