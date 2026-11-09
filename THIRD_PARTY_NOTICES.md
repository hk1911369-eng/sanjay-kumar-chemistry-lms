# Third-party notices

## Double-pendulum numerical method

JMT Academy's educational double-pendulum model adapts the angular-acceleration equations and fourth-order Runge–Kutta integration approach from **BN Lab Simulations**, by B&N Solutions, in `src/experiments/pendulum.js` (upstream repository: https://github.com/4mser/bn-lab-simulations, reviewed source revision `1d7f884bb629e10676f9a266e10a49792dbf635b`).

The upstream project is licensed under the MIT License. The relevant notice is reproduced below:

```
MIT License

Copyright (c) 2026 B&N Solutions

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

JMT Academy's implementation is independently typed, bounded, unit-explicit, tested for energy conservation, and integrated into its own student learning interface. The upstream visual renderer and runtime engine are not bundled.
