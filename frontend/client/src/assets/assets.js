import logo from './logo_white.png';
import marvelLogo from './marvelLogo.svg';
import googlePlay from './googlePlay.svg';
import appStore from './appStore.svg';
import screenImage from './screenImage.svg';
import profile from './profile.png';

export const assets = {
  logo,
  marvelLogo,
  googlePlay,
  appStore,
  screenImage,
  profile,
};

export const dummyTrailers = [
  {
    image: '/images/trailers/74dd6f96d810e23c0a925674d4264635.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=WpW36ldAqnM',
  },
  {
    image: '/images/trailers/4f5369d110ac4902997e95370a87486e.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=-sAOWhvheK8',
  },
  {
    image: '/images/trailers/c38e285954c2fc09852382b106238973.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=1pHDWnXmK7Y',
  },
  {
    image: '/images/trailers/0dffc4e9b0421df95bdec9c5dccf88b4.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=umiKiW4En9g',
  },
];

const dummyCastsData = [
  {
    name: 'Milla Jovovich',
    profile_path: '/images/casts/de55eb601bc6795267af9160f322d7e2.jpg',
  },
  {
    name: 'Dave Bautista',
    profile_path: '/images/casts/cc5cb5e0af1db1e5f20d02df682fb26a.jpg',
  },
  {
    name: 'Arly Jover',
    profile_path: '/images/casts/fa758c3f9918f4e629cdd98ec91e4b51.jpg',
  },
  {
    name: 'Amara Okereke',
    profile_path: '/images/casts/7e6e790795dc6fecc3239f70833a185a.jpg',
  },
  {
    name: 'Fraser James',
    profile_path: '/images/casts/a67e625bf3b7968552e07b3fdd8af67d.jpg',
  },
  {
    name: 'Deirdre Mullins',
    profile_path: '/images/casts/ba4afa5f4648a04cacb2726169510100.jpg',
  },
  {
    name: 'Sebastian Stankiewicz',
    profile_path: '/images/casts/1bd37a6cca1276402aa2c85872902c00.jpg',
  },
  {
    name: 'Tue Lunding',
    profile_path: '/images/casts/a37149576de212bfcfdb8333b53b132f.jpg',
  },
  {
    name: 'Jacek Dzisiewicz',
    profile_path: '/images/casts/2e278ae49f24c41f3121456895b8728d.jpg',
  },
  {
    name: 'Ian Hanmore',
    profile_path: '/images/casts/2c5643f75b800b4b5d299047169e4d7a.jpg',
  },
  {
    name: 'Eveline Hall',
    profile_path: '/images/casts/17228d0d0e32591f35c4ade53a932cc9.jpg',
  },
  {
    name: 'Kamila Klamut',
    profile_path: '/images/casts/de55eb601bc6795267af9160f322d7e2.jpg',
  },
  {
    name: 'Caoilinn Springall',
    profile_path: '/images/casts/6fa0ba26db56d3a85e50b62d45254755.jpg',
  },
  {
    name: 'Jan Kowalewski',
    profile_path: '/images/casts/cc5cb5e0af1db1e5f20d02df682fb26a.jpg',
  },
  {
    name: 'Pawel Wysocki',
    profile_path: '/images/casts/fa758c3f9918f4e629cdd98ec91e4b51.jpg',
  },
  {
    name: 'Simon Lööf',
    profile_path: '/images/casts/254c4097e35d3d6979f96ce69fa3fe41.jpg',
  },
  {
    name: 'Tomasz Cymerman',
    profile_path: '/images/casts/7e6e790795dc6fecc3239f70833a185a.jpg',
  },
];

export const dummyShowsData = [
  {
    _id: '324544',
    id: 324544,
    title: 'In the Lost Lands',
    overview:
      'A queen sends the powerful and feared sorceress Gray Alys to the ghostly wilderness of the Lost Lands in search of a magical power, where she and her guide, the drifter Boyce, must outwit and outfight both man and demon.',
    poster_path: '/images/posters/0c37b4c4eee1dc37e70857b527096300.jpg',
    backdrop_path: '/images/backdrops/4eacbb76e4c0f95135941cdd7079861c.jpg',
    genres: [
      { id: 28, name: 'Action' },
      { id: 14, name: 'Fantasy' },
      { id: 12, name: 'Adventure' },
    ],
    casts: dummyCastsData,
    release_date: '2025-02-27',
    original_language: 'en',
    tagline: 'She seeks the power to free her people.',
    vote_average: 6.4,
    vote_count: 15000,
    runtime: 102,
  },
  {
    _id: '1232546',
    id: 1232546,
    title: 'Until Dawn',
    overview:
      'One year after her sister Melanie mysteriously disappeared, Clover and her friends head into the remote valley where she vanished in search of answers. Exploring an abandoned visitor center, they find themselves stalked by a masked killer and horrifically murdered one by one...only to wake up and find themselves back at the beginning of the same evening.',
    poster_path: '/images/posters/b1a3c54c37c63dc78535de626689af46.jpg',
    backdrop_path: '/images/backdrops/7bc1e0bed2e94e8fc5fe7e479e8c23fd.jpg',
    genres: [
      { id: 27, name: 'Horror' },
      { id: 9648, name: 'Mystery' },
    ],
    casts: dummyCastsData,
    release_date: '2025-04-23',
    original_language: 'en',
    tagline: 'Every night a different nightmare.',
    vote_average: 6.405,
    vote_count: 18000,
    runtime: 103,
  },
  {
    _id: '552524',
    id: 552524,
    title: 'Lilo & Stitch',
    overview:
      'The wildly funny and touching story of a lonely Hawaiian girl and the fugitive alien who helps to mend her broken family.',
    poster_path: '/images/posters/16d414ac3700f01d08a88c732c7057c9.jpg',
    backdrop_path: '/images/backdrops/c5eef172910e2ec57600e68c6e620332.jpg',
    genres: [
      { id: 10751, name: 'Family' },
      { id: 35, name: 'Comedy' },
      { id: 878, name: 'Science Fiction' },
    ],
    casts: dummyCastsData,
    release_date: '2025-05-17',
    original_language: 'en',
    tagline: 'Hold on to your coconuts.',
    vote_average: 7.117,
    vote_count: 27500,
    runtime: 108,
  },
  {
    _id: '668489',
    id: 668489,
    title: 'Havoc',
    overview:
      "When a drug heist swerves lethally out of control, a jaded cop fights his way through a corrupt city's criminal underworld to save a politician's son.",
    poster_path: '/images/posters/2d0e9a17ec449262596e2758d6e694db.jpg',
    backdrop_path: '/images/backdrops/c87c44a228930d906afb20e30ab5cb8d.jpg',
    genres: [
      { id: 28, name: 'Action' },
      { id: 80, name: 'Crime' },
      { id: 53, name: 'Thriller' },
    ],
    casts: dummyCastsData,
    release_date: '2025-04-25',
    original_language: 'en',
    tagline: 'No law. Only disorder.',
    vote_average: 6.537,
    vote_count: 35960,
    runtime: 107,
  },
  {
    _id: '950387',
    id: 950387,
    title: 'A Minecraft Movie',
    overview:
      "Four misfits find themselves struggling with ordinary problems when they are suddenly pulled through a mysterious portal into the Overworld: a bizarre, cubic wonderland that thrives on imagination. To get back home, they'll have to master this world while embarking on a magical quest with an unexpected, expert crafter, Steve.",
    poster_path: '/images/posters/d09d9be5eb2e7b556593aef707d39439.jpg',
    backdrop_path: '/images/backdrops/8fea7f114040cb1bff29d959eee2b57d.jpg',
    genres: [
      { id: 10751, name: 'Family' },
      { id: 35, name: 'Comedy' },
      { id: 12, name: 'Adventure' },
      { id: 14, name: 'Fantasy' },
    ],
    casts: dummyCastsData,
    release_date: '2025-03-31',
    original_language: 'en',
    tagline: 'Be there and be square.',
    vote_average: 6.516,
    vote_count: 15225,
    runtime: 101,
  },
  {
    _id: '575265',
    id: 575265,
    title: 'Mission: Impossible - The Final Reckoning',
    overview:
      "Ethan Hunt and team continue their search for the terrifying AI known as the Entity — which has infiltrated intelligence networks all over the globe — with the world's governments and a mysterious ghost from Hunt's past on their trail. Joined by new allies and armed with the means to shut the Entity down for good, Hunt is in a race against time to prevent the world as we know it from changing forever.",
    poster_path: '/images/posters/39727c0f450c05531c37c17c9c3db178.jpg',
    backdrop_path: '/images/backdrops/bec315e51d9c5a5a4c7fee2303b4f7b8.jpg',
    genres: [
      { id: 28, name: 'Action' },
      { id: 12, name: 'Adventure' },
      { id: 53, name: 'Thriller' },
    ],
    casts: dummyCastsData,
    release_date: '2025-05-17',
    original_language: 'en',
    tagline: 'Our lives are the sum of our choices.',
    vote_average: 7.042,
    vote_count: 19885,
    runtime: 170,
  },
  {
    _id: '986056',
    id: 986056,
    title: 'Thunderbolts*',
    overview:
      'After finding themselves ensnared in a death trap, seven disillusioned castoffs must embark on a dangerous mission that will force them to confront the darkest corners of their pasts.',
    poster_path: '/images/posters/bc91bef317a97a46a8efd9f6ff17705a.jpg',
    backdrop_path: '/images/backdrops/2105c965bce9a394e2c589254bc2f251.jpg',
    genres: [
      { id: 28, name: 'Action' },
      { id: 878, name: 'Science Fiction' },
      { id: 12, name: 'Adventure' },
    ],
    casts: dummyCastsData,
    release_date: '2025-04-30',
    original_language: 'en',
    tagline: 'Everyone deserves a second shot.',
    vote_average: 7.443,
    vote_count: 23569,
    runtime: 127,
  },
];

export const dummyDateTimeData = {
  '2025-07-24': [
    { time: '2025-07-24T01:00:00.000Z', showId: '68395b407f6329be2bb45bd1' },
    { time: '2025-07-24T03:00:00.000Z', showId: '68395b407f6329be2bb45bd2' },
    { time: '2025-07-24T05:00:00.000Z', showId: '68395b407f6329be2bb45bd3' },
  ],
  '2025-07-25': [
    { time: '2025-07-25T01:00:00.000Z', showId: '68395b407f6329be2bb45bd4' },
    { time: '2025-07-25T03:00:00.000Z', showId: '68395b407f6329be2bb45bd5' },
    { time: '2025-07-25T05:00:00.000Z', showId: '68395b407f6329be2bb45bd6' },
  ],
  '2025-07-26': [
    { time: '2025-07-26T01:00:00.000Z', showId: '68395b407f6329be2bb45bd7' },
    { time: '2025-07-26T03:00:00.000Z', showId: '68395b407f6329be2bb45bd8' },
    { time: '2025-07-26T05:00:00.000Z', showId: '68395b407f6329be2bb45bd9' },
  ],
  '2025-07-27': [
    { time: '2025-07-27T01:00:00.000Z', showId: '68395b407f6329be2bb45bda' },
    { time: '2025-07-27T03:00:00.000Z', showId: '68395b407f6329be2bb45bdb' },
    { time: '2025-07-27T05:00:00.000Z', showId: '68395b407f6329be2bb45bdc' },
  ],
};

export const dummyDashboardData = {
  totalBookings: 14,
  totalRevenue: 1517,
  totalUser: 5,
  activeShows: [
    {
      _id: '68352363e96d99513e4221a4',
      movie: dummyShowsData[0],
      showDateTime: '2025-06-30T02:30:00.000Z',
      showPrice: 59,
      occupiedSeats: {
        A1: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
        B1: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
        C1: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
      },
    },
    {
      _id: '6835238fe96d99513e4221a8',
      movie: dummyShowsData[1],
      showDateTime: '2025-06-30T15:30:00.000Z',
      showPrice: 81,
      occupiedSeats: {},
    },
    {
      _id: '6835238fe96d99513e4221a9',
      movie: dummyShowsData[2],
      showDateTime: '2025-06-30T03:30:00.000Z',
      showPrice: 81,
      occupiedSeats: {},
    },
    {
      _id: '6835238fe96d99513e4221aa',
      movie: dummyShowsData[3],
      showDateTime: '2025-07-15T16:30:00.000Z',
      showPrice: 81,
      occupiedSeats: {
        A1: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
        A2: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
        A3: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
        A4: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
      },
    },
    {
      _id: '683682072b5989c29fc6dc0d',
      movie: dummyShowsData[4],
      showDateTime: '2025-06-05T15:30:00.000Z',
      showPrice: 49,
      occupiedSeats: {
        A1: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
        A2: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
        A3: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
        B1: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
        B2: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
        B3: 'user_2xO4XPCgWWwWq9EHuQxc5UWqIok',
      },
      __v: 0,
    },
    {
      _id: '68380044686d454f2116b39a',
      movie: dummyShowsData[5],
      showDateTime: '2025-06-20T16:00:00.000Z',
      showPrice: 79,
      occupiedSeats: {
        A1: 'user_2xl7eCSUHddibk5lRxfOtw9RMwX',
        A2: 'user_2xl7eCSUHddibk5lRxfOtw9RMwX',
      },
    },
  ],
};

export const dummyBookingData = [
  {
    _id: '68396334fb83252d82e17295',
    user: { name: 'GreatStack' },
    show: {
      _id: '68352363e96d99513e4221a4',
      movie: dummyShowsData[0],
      showDateTime: '2025-06-30T02:30:00.000Z',
      showPrice: 59,
    },
    amount: 98,
    bookedSeats: ['D1', 'D2'],
    isPaid: false,
  },
  {
    _id: '68396334fb83252d82e17295',
    user: { name: 'GreatStack' },
    show: {
      _id: '68352363e96d99513e4221a4',
      movie: dummyShowsData[0],
      showDateTime: '2025-06-30T02:30:00.000Z',
      showPrice: 59,
    },
    amount: 49,
    bookedSeats: ['A1'],
    isPaid: true,
  },
  {
    _id: '68396334fb83252d82e17295',
    user: { name: 'GreatStack' },
    show: {
      _id: '68352363e96d99513e4221a4',
      movie: dummyShowsData[0],
      showDateTime: '2025-06-30T02:30:00.000Z',
      showPrice: 59,
    },
    amount: 147,
    bookedSeats: ['A1', 'A2', 'A3'],
    isPaid: true,
  },
];
