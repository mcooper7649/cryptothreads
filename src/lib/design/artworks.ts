/**
 * Public-domain paintings used as print styles ("art-*"), each with a crypto
 * spin: laser eyes where there's a face, and a caption under it. Files are in
 * src/assets/art (downloaded from Wikimedia Commons on 2026-10-13; every one
 * is marked "Public domain" in its Commons license metadata).
 *
 * crop and eyes are fractions of the file's width/height; eyes are measured on
 * the full image and placed after cropping.
 */

export interface Artwork {
  id: string;
  label: string;
  file: string;
  credit: string;
  /** What it means as a meme, for the slogan writer. */
  meme: string;
  crop: [number, number, number, number];
  eyes?: [number, number][];
}

export const ARTWORKS: Artwork[] = [
  { id: "scream", label: "The Scream", file: "scream.jpg", credit: "after Munch, The Scream, 1893", meme: "panic, checking your portfolio, the dump", crop: [0.04, 0.0, 0.96, 0.93] },
  { id: "monalisa", label: "Mona Lisa", file: "monalisa.jpg", credit: "after Leonardo, Mona Lisa, c. 1503", meme: "smug laser-eyed hodler, unbothered", crop: [0.1, 0.04, 0.9, 0.6], eyes: [[0.397, 0.229], [0.503, 0.229]] },
  { id: "wave", label: "The Great Wave", file: "wave.jpg", credit: "after Hokusai, The Great Wave, c. 1831", meme: "the dip, a liquidation wave, volatility", crop: [0, 0, 1, 1] },
  { id: "napoleon", label: "Napoleon", file: "napoleon.jpg", credit: "after David, Napoleon in His Study, 1812", meme: "laser-eyed conqueror, whale energy, empire building", crop: [0.18, 0.03, 0.82, 0.42], eyes: [[0.458, 0.161], [0.513, 0.161]] },
  { id: "adam", label: "Creation", file: "adam.jpg", credit: "after Michelangelo, The Creation of Adam, c. 1512", meme: "passing the bag, sending it, divine alpha", crop: [0, 0, 1, 1] },
  { id: "liberty", label: "Liberty", file: "liberty.jpg", credit: "after Delacroix, Liberty Leading the People, 1830", meme: "laser-eyed revolution, bulls leading the charge", crop: [0.2, 0.0, 0.95, 0.72], eyes: [[0.591, 0.159]] },
  { id: "socrates", label: "Socrates", file: "socrates.jpg", credit: "after David, The Death of Socrates, 1787", meme: "drinking the hemlock = buying the top, famous last words", crop: [0, 0, 1, 1] },
  { id: "harvesters", label: "Harvesters", file: "harvesters.jpg", credit: "after Bruegel, The Harvesters, 1565", meme: "airdrop farming, grinding points", crop: [0, 0, 1, 1] },
  { id: "delaware", label: "Crossing", file: "delaware.jpg", credit: "after Leutze, Washington Crossing the Delaware, 1851", meme: "we ride at dawn, sending it, the raid", crop: [0, 0, 1, 1] },
  { id: "pearl", label: "Pearl Earring", file: "pearl.jpg", credit: "after Vermeer, Girl with a Pearl Earring, c. 1665", meme: "laser eyes looking back at the chart you sold", crop: [0.14, 0.12, 0.86, 0.74], eyes: [[0.347, 0.373], [0.455, 0.39]] },
  { id: "starry", label: "Starry Night", file: "starry.jpg", credit: "after Van Gogh, The Starry Night, 1889", meme: "up all night watching charts, swirling candles", crop: [0, 0, 1, 1] },
];

export const artworkFor = (style: string) => (style.startsWith("art-") ? ARTWORKS.find((a) => `art-${a.id}` === style) : undefined);
