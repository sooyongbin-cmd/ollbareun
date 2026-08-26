# Services page section 1 responsive values

Source: Figma `page3_서비스` (`914:2105`), measured from each section 1 frame and its hero text node.

| Viewport | Figma section 1 node | Section height | Hero font size |
| ---: | --- | ---: | ---: |
| 1920px | `914:2107` | 502px | 53px |
| 1280px | `914:2329` | 502px | 53px |
| 1024px | `914:2551` | 502px | 53px |
| 768px | `914:2770` | 376px | 45px |
| 640px | `914:2989` | 314px | 38px |
| 480px | `914:3210` | 280px | 30px |

The implementation uses explicit CSS media-query states. It does not interpolate the section height or hero font size with `clamp()` or `calc()`. The final service-page design state is 480px; there is no separate 360px service hero state.
