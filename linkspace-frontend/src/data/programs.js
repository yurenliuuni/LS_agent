export const CATEGORIES = [
  {
    slug: "abs",
    name: "Abs",
    defaultLayout: "mat",
    videos: [
      { slug: "beginner-abs", title: "10 min beginner abs", minutes: 10, youtubeId: "1f8yoFFdkcY" },
      { slug: "ab-workout", title: "10 min abs", minutes: 10, youtubeId: "AnYl6Nk9GOA" },
      { slug: "sixpack", title: "10 min sixpack", minutes: 10, youtubeId: "Q-vuR4PJh2c" },
      { slug: "killer-sixpack", title: "10 min killer sixpack", minutes: 10, youtubeId: "vOiP3kfFlrE" },
      { slug: "ab-lines", title: "10 min ab lines", minutes: 10, youtubeId: "o3mfKLCerec" },
      { slug: "lower-abs", title: "10 min lower abs extreme", minutes: 10, youtubeId: "Gg3W2x0dnDg" },
      { slug: "15-sixpack", title: "15 min sixpack", minutes: 15, youtubeId: "EfJ4aB_enVE" },
    ],
  },
  {
    slug: "full-body",
    name: "Full body",
    defaultLayout: "mat",
    videos: [
      { slug: "full-body", title: "20 min full body", minutes: 20, youtubeId: "UBMk30rjy0o" },
      { slug: "full-body-beginner", title: "20 min full body beginner", minutes: 20, youtubeId: "UItWltVZZmE" },
      { slug: "full-body-intense", title: "20 min full body intense", minutes: 20, youtubeId: "Y2eOW7XYWxc" },
      { slug: "full-body-hiit", title: "15 min full body HIIT", minutes: 15, youtubeId: "1skBf6h2ksI" },
      { slug: "full-body-cardio", title: "15 min full body cardio", minutes: 15, youtubeId: "HLQ0NCN_Z4Q" },
    ],
  },
  {
    slug: "standing",
    name: "Standing & cardio",
    defaultLayout: "standing",
    videos: [
      { slug: "standing-abs", title: "15 min standing abs + fat burn", minutes: 15, youtubeId: "HLTYHepZ1EA" },
      { slug: "hiit-10", title: "10 min high intensity", minutes: 10, youtubeId: "zr08J6wB53Y" },
      { slug: "1000-steps", title: "1000 steps cardio", minutes: 10, youtubeId: "mCeFdXQtj5E" },
      { slug: "2000-steps", title: "2000 steps cardio", minutes: 20, youtubeId: "CCgEzLrf45Y" },
      { slug: "jumping-cardio", title: "15 min jumping cardio", minutes: 15, youtubeId: "u3pVIgNcgtA" },
      { slug: "monster-cardio", title: "10 min monster cardio", minutes: 10, youtubeId: "hAQ2CdK5A_o" },
      { slug: "happy-dance", title: "15 min happy dance", minutes: 15, youtubeId: "Cw-Wt4xKD2s" },
      { slug: "pam-power", title: "15 min Pam Power dance", minutes: 15, youtubeId: "Od8rOWG_LC4" },
      { slug: "sweaty-endorphins", title: "10 min sweaty endorphins", minutes: 10, youtubeId: "LcxzO9FSLfQ" },
      { slug: "1000-hiit", title: "1000 steps HIIT", minutes: 10, youtubeId: "m4YRhITOFp4" },
    ],
  },
];

export const PROGRAMS = CATEGORIES.flatMap((category) =>
  category.videos.map((video) => ({
    ...video,
    category: category.slug,
    defaultLayout: category.defaultLayout,
  })),
);

export function findProgram(slug) {
  return PROGRAMS.find((item) => item.slug === slug) ?? null;
}

export const CLUBS = [
  { slug: "pamela-daily", name: "Pamela Daily", tagline: "One Pamela session a day", members: 214 },
  { slug: "standing-crew", name: "Standing Crew", tagline: "Split screen, left mirror, right coach", members: 88 },
  { slug: "mat-club", name: "Mat Club", tagline: "Coach on top, mirror below", members: 61 },
];
