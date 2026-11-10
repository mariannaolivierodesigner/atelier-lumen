// Immagini del template di riferimento (Framer CDN), nell'ordine in cui compaiono nella pagina.
const cdn = (id: string, width: number) =>
  `https://framerusercontent.com/images/${id}?width=${width}`;

export const IMG = {
  hero: cdn("hO91PckZt73P3T3QhPCSOs2lHc.png", 2400),
  intro: cdn("VMV9FAJY0WI4cv9OlAeAG4XGAw8.png", 900),
  c1: cdn("cPEq4OAiX9jyexmshhwVlGOq4.png", 800),
  c2: cdn("D9vlIrdXGHzu5BVtZw2nFWIklrQ.jpg", 800),
  c3: cdn("fm57i4Y6dqmmtO7uIq32ovqGrw.jpg", 800),
  c4: cdn("fF0agB0OoURvmmKEXCmmtFw160.jpg", 800),
  c5: cdn("u1MHLkm9tD8D72dXyPFDFhmlY.jpg", 800),
  f1: cdn("GoUtReYa2P8zSQYsGMnXNK22SE.png", 1000),
  f2: cdn("tVcRNZy0t9NYsJsllK8vCPzjG2Q.jpg", 1000),
  f3: cdn("8IU8WzXn4akfb7n5JEscbLSeI.jpg", 1000),
  banner: cdn("RuftkB48mJeCcA1X0tEmQ5iAXc.png", 2400),
  row1: cdn("oA5NE41kQc0x60ZwVsZhhbymcGk.png", 1400),
  row2: cdn("g9sgEXnVkm9OEG34cPa8oLLtew.png", 1400),
  t1: cdn("VBO8LVQasXFieJsdc9hx0LjeXg.png", 900),
  t2: cdn("0n6kbbjeJsdl1tV3J6MtNnptXR4.png", 900),
  t3: cdn("8wua52J3d5A0CcbbjJ9vOx9wdoQ.png", 900),
  cta: cdn("8Q3opc0zGkghdiSGwiNtaFgV5k.png", 2400),
} as const;
