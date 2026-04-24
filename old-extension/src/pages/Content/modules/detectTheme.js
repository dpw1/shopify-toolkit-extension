/*
## Intro:
Detects which Free theme the Shopify website is using.
If it's not a Free theme it returns null.

You can use the following websites to test it out:

Debut:
https://debut-theme-default.myshopify.com/

Narrative:
https://narrative-theme-earthy.myshopify.com/

Express:
https://express-theme-bistro.myshopify.com/

Venture:
https://venture-theme-snowboards.myshopify.com/

Boundless:
https://boundless-theme-apparel.myshopify.com/

Simple:
https://simpletheme-light.myshopify.com/

Brooklyn:
https://brooklyn-theme-classic.myshopify.com/

Supply:
https://supply-electronics.myshopify.com/

Minimal:
https://minimal-vintage-theme.myshopify.com/


## Premium Themes:

Highlight:
https://highlight-theme.myshopify.com/

Expanse:
https://expanse-theme-furniture.myshopify.com/

Streamline:
https://streamline-theme-core.myshopify.com

## Usage:
*/

import { getBoomrObject } from './utils';

/* Continue from: 
https://themes.shopify.com/themes?ajax=true&page=2&price%5B%5D=paid&sort_by=most_recent

*/

const themes = {
  superstore: {
    name: 'Superstore',
    url: 'https://outofthesandbox.com/collections/superstore-theme',
    download:
      'https://outofthesandbox.com/collections/superstore-theme?source=ezfycode.com',
    type: 'Paid',
  },

  turbo: {
    name: 'Turbo',
    url: 'https://turbo-theme.myshopify.com/',
    download:
      'https://outofthesandbox.com/products/turbo-theme-portland?source=ezfycode.com',
    type: 'Paid',
  },

  fashionopolism: {
    name: 'Fashionopolism',
    url: 'https://fashionopolism-responsive.myshopify.com/',
    download: 'https://themes.shopify.com/themes/fashionopolism/styles/empire',
    type: 'Paid',
  },
  debut: {
    name: 'Debut',
    url: 'https://debut-theme-default.myshopify.com/',
    download: 'https://themes.shopify.com/themes/debut/styles/default',
    type: 'Free',
  },

  narrative: {
    name: 'Narrative',
    url: 'https://narrative-theme-earthy.myshopify.com/',
    download: 'https://themes.shopify.com/themes/narrative/styles/earthy',
    type: 'Free',
  },

  express: {
    name: 'Express',
    url: 'https://express-theme-bistro.myshopify.com/',
    download: 'https://themes.shopify.com/themes/express/styles/bistro',
    type: 'Free',
  },

  venture: {
    name: 'Venture',
    url: 'https://venture-theme-snowboards.myshopify.com/',
    download: 'https://themes.shopify.com/themes/venture/styles/outdoors',

    type: 'Free',
  },

  boundless: {
    name: 'Boundless',
    url: 'https://boundless-theme-apparel.myshopify.com/',
    download: 'https://themes.shopify.com/themes/boundless/styles/black-white',
    type: 'Free',
  },

  simple: {
    name: 'Simple',
    url: 'https://simpletheme-light.myshopify.com/',
    download: 'https://themes.shopify.com/themes/simple/styles/light',
    type: 'Free',
  },
  brooklyn: {
    name: 'Brooklyn',
    url: 'https://brooklyn-theme-classic.myshopify.com/',
    download: 'https://themes.shopify.com/themes/brooklyn/styles/classic',
    type: 'Free',
  },

  supply: {
    name: 'Supply',
    url: 'https://supply-electronics.myshopify.com/',
    download: 'https://themes.shopify.com/themes/supply/styles/blue',
    type: 'Free',
  },

  minimal: {
    name: 'Minimal',
    url: 'https://minimal-vintage-theme.myshopify.com/',
    download: 'https://themes.shopify.com/themes/minimal/styles/fashion',
    type: 'Free',
  },

  highlight: {
    name: 'Highlight',
    url: 'https://highlight-theme.myshopify.com/',
    download: 'https://themes.shopify.com/themes/highlight/styles/modern',
    type: 'Paid',
  },
  expanse: {
    name: 'Expanse',
    url: 'https://expanse-theme-furniture.myshopify.com/',
    download: 'https://themes.shopify.com/themes/expanse/styles/classic',
    type: 'Paid',
  },

  streamline: {
    name: 'Streamline',
    url: 'https://streamline-theme-core.myshopify.com',
    download: 'https://themes.shopify.com/themes/streamline/styles/core',
    type: 'Paid',
  },

  warehouse: {
    name: 'Warehouse',
    url: 'https://warehouse-theme-metal.myshopify.com/',
    download: 'https://themes.shopify.com/themes/warehouse/styles/metal',
    type: 'Paid',
  },

  context: {
    name: 'Context',
    url: 'https://context-theme-chic.myshopify.com/',
    download: 'https://themes.shopify.com/themes/context/styles/modern',
    type: 'Paid',
  },

  broadcast: {
    name: 'Broadcast',
    url: 'https://broadcast-clean.myshopify.com/',
    download: 'https://themes.shopify.com/themes/broadcast/styles/clean',
    type: 'Paid',
  },

  avenue: {
    name: 'Avenue',
    url: 'https://clothing-filter-theme.myshopify.com',
    type: 'Paid',
    download: 'https://themes.shopify.com/themes/avenue/styles/casual',
  },

  story: {
    name: 'Story',
    url: 'https://story-theme.myshopify.com/',
    type: 'Paid',
    download: 'https://themes.shopify.com/themes/story/styles/chronicle',
  },

  boost: {
    name: 'Boost',
    url: 'https://spark-theme.myshopify.com',
    type: 'Paid',
    download: 'https://themes.shopify.com/themes/boost/styles/spark',
  },

  cascade: {
    name: 'Cascade',
    url: 'https://cascade-theme-classic.myshopify.com/',
    type: 'Paid',
    download: 'https://themes.shopify.com/themes/cascade/styles/classic',
  },

  impulse: {
    name: 'Impulse',
    download: 'https://themes.shopify.com/themes/impulse/styles/modern',
    type: 'Paid',
    url: 'https://impulse-theme-fashion.myshopify.com/',
  },

  artisan: {
    name: 'Artisan',
    download: 'https://themes.shopify.com/themes/artisan/styles/victoria?',
    type: 'Paid',
    url: 'https://artisan-theme-victoria.myshopify.com',
  },

  prestige: {
    name: 'Prestige',
    download: 'https://themes.shopify.com/themes/prestige/styles/allure',
    type: 'Paid',
    url: 'https://prestige-theme-allure.myshopify.com/',
  },

  reach: {
    name: 'Reach',
    download: 'https://themes.shopify.com/themes/reach/styles/natural',
    type: 'Paid',
    url: 'https://reach-theme-natural.myshopify.com/',
  },

  galleria: {
    name: 'Galleria',
    download: 'https://themes.shopify.com/themes/galleria/styles/empire',
    type: 'Paid',
    url: 'https://mht-dev.myshopify.com/',
  },

  modular: {
    name: 'Modular',
    download: 'https://themes.shopify.com/themes/modular/styles/chelsea',
    type: 'Paid',
    url: 'https://chelsea-theme.myshopify.com/',
  },

  motion: {
    name: 'Motion',
    download: 'https://themes.shopify.com/themes/motion/styles/classic',
    type: 'Paid',
    url: 'https://motion-theme-adventure.myshopify.com/',
  },

  loft: {
    name: 'Loft',
    download: 'https://themes.shopify.com/themes/loft/styles/nashville',
    type: 'Paid',
    url: 'https://loft-theme-demo-nashville.myshopify.com/',
  },

  split: {
    name: 'Split',
    download: 'https://themes.shopify.com/themes/split/styles/cuber',
    type: 'Paid',
    url: 'https://cuber-theme.myshopify.com/',
  },

  empire: {
    name: 'Empire',
    download: 'https://themes.shopify.com/themes/empire/styles/supply',
    type: 'Paid',
    url: 'https://empire-theme-supply.myshopify.com/',
  },

  venue: {
    name: 'Venue',
    download: 'https://themes.shopify.com/themes/venue/styles/morning',
    type: 'Paid',
    url: 'https://venue-theme-morning.myshopify.com/',
  },

  emerge: {
    name: 'Emerge',
    download: 'https://themes.shopify.com/themes/emerge/styles/bright',
    type: 'Paid',
    url: 'https://local-theme-bright.myshopify.com/',
  },

  editorial: {
    name: 'Editorial',
    download: 'https://themes.shopify.com/themes/editorial/styles/agency',
    type: 'Paid',
    url: 'https://editorial-theme-agency.myshopify.com/',
  },

  handy: {
    name: 'Handy',
    download: 'https://themes.shopify.com/themes/handy/styles/light',
    type: 'Paid',
    url: 'https://handy-theme-light.myshopify.com/',
  },

  trademark: {
    name: 'Trademark',
    download: 'https://themes.shopify.com/themes/trademark/styles/gold',
    type: 'Paid',
    url: 'https://trademark-gold.myshopify.com/',
  },

  capital: {
    name: 'Capital',
    download: 'https://themes.shopify.com/themes/capital/styles/berlin',
    type: 'Paid',
    url: 'https://capital-theme-berlin.myshopify.com/',
  },

  vogue: {
    name: 'Vogue',
    download:
      'https://themes.shopify.com/themes/vogue/styles/elegant?price%5B%5D=Paid&surface_inter_position',
    type: 'Paid',
    url: 'https://vogue-theme-elegant.myshopify.com/',
  },

  flow: {
    name: 'Flow',
    download: 'https://themes.shopify.com/themes/flow/styles/queenstown',
    type: 'Paid',
    url: 'https://flow-queenstown.myshopify.com/',
  },

  lorenza: {
    name: 'Lorenza',
    download: 'https://themes.shopify.com/themes/lorenza/styles/chic',
    type: 'Paid',
    url: 'https://lorenza-theme-chic.myshopify.com/',
  },

  launch: {
    name: 'Launch',
    download: 'https://themes.shopify.com/themes/launch/styles/cool',
    type: 'Paid',
    url: 'https://launch-theme-cool.myshopify.com/',
  },

  ira: {
    name: 'Ira',
    download: 'https://themes.shopify.com/themes/ira/styles/active',
    type: 'Paid',
    url: 'https://ira-theme-active.myshopify.com/',
  },

  palo_alto: {
    name: 'Palo Alto',
    download: 'https://themes.shopify.com/themes/palo-alto/styles/palo-alto',
    type: 'Paid',
    url: 'https://palo-alto-theme.myshopify.com/',
  },

  maker: {
    name: 'Maker',
    download: 'https://themes.shopify.com/themes/maker/styles/bloom',
    type: 'Paid',
    url: 'https://maker-theme-bloom.myshopify.com/',
  },

  label: {
    name: 'Label',
    download: 'https://themes.shopify.com/themes/label/styles/record',
    type: 'Paid',
    url: 'https://label-theme-record.myshopify.com/',
  },

  pipeline: {
    name: 'Pipeline',
    download: 'https://themes.shopify.com/themes/pipeline/styles/light',
    type: 'Paid',
    url: 'https://pipeline-light.myshopify.com/',
  },

  colors: {
    name: 'Colors',
    download: 'https://themes.shopify.com/themes/colors/styles/generic',
    type: 'Paid',
    url: 'https://colors-theme-generic.myshopify.com/',
  },

  kagami: {
    name: 'Kagami',
    download: 'https://themes.shopify.com/themes/kagami/styles/kyoto',
    type: 'Paid',
    url: 'https://kagami-tokyo.myshopify.com/',
  },

  district: {
    name: 'District',
    download: 'https://themes.shopify.com/themes/district/styles/district',
    type: 'Paid',
    url: 'https://district-theme-demo.myshopify.com/',
  },

  canopy: {
    name: 'Canopy',
    download: 'https://themes.shopify.com/themes/canopy/styles/kiln',
    type: 'Paid',
    url: 'https://kiln-theme.myshopify.com/',
  },

  kingdom: {
    name: 'Kingdom',
    download: 'https://themes.shopify.com/themes/kingdom/styles/king',
    type: 'Paid',
    url: 'https://king-theme-v2.myshopify.com/',
  },

  grid: {
    name: 'Grid',
    download: 'https://themes.shopify.com/themes/grid/styles/bright',
    type: 'Paid',
    url: 'https://grid-theme-bright.myshopify.com/',
  },

  showtime: {
    name: 'ShowTime',
    download: 'https://themes.shopify.com/themes/showtime/styles/cooktime',
    type: 'Paid',
    url: 'https://cooktime.myshopify.com/',
  },

  focal: {
    name: 'Focal',
    download: 'https://themes.shopify.com/themes/focal/styles/standard',
    type: 'Paid',
    url: 'https://focal-standard.myshopify.com/',
  },

  pacific: {
    name: 'Pacific',
    download: 'https://themes.shopify.com/themes/pacific/styles/bold',
    type: 'Paid',
    url: 'https://pacific-theme-bold.myshopify.com/',
  },

  california: {
    name: 'California',
    download: 'https://themes.shopify.com/themes/california/styles/california',
    type: 'Paid',
    url: 'https://california-theme-generic.myshopify.com/',
  },

  icon: {
    name: 'Icon',
    download: 'https://themes.shopify.com/themes/icon/styles/dolce',
    type: 'Paid',
    url: 'https://icon-shopify-theme.myshopify.com/',
  },

  parallax: {
    name: 'Parallax',
    download: 'https://themes.shopify.com/themes/parallax/styles/aspen',
    type: 'Paid',
    url: 'https://parallax-theme-aspen.myshopify.com/',
  },

  showcase: {
    name: 'Showcase',
    download: 'https://themes.shopify.com/themes/showcase/styles/betty',
    type: 'Paid',
    url: 'https://betty-theme.myshopify.com/',
  },

  alchemy: {
    name: 'Alchemy',
    download: 'https://themes.shopify.com/themes/alchemy/styles/swimclub',
    type: 'Paid',
    url: 'https://swimclub-theme.myshopify.com/',
  },

  startup: {
    name: 'Startup',
    download: 'https://themes.shopify.com/themes/startup/styles/home',
    type: 'Paid',
    url: 'https://startup-theme-home.myshopify.com/',
  },

  testament: {
    name: 'Testament',
    download: 'https://themes.shopify.com/themes/testament/styles/genesis',
    type: 'Paid',
    url: 'https://testament.myshopify.com/',
  },

  blockshop: {
    name: 'Blockshop',
    download: 'https://themes.shopify.com/themes/blockshop/styles/beauty',
    type: 'Paid',
    url: 'https://blockshop-theme-beauty.myshopify.com/',
  },

  retina: {
    name: 'Retina',
    download: 'https://themes.shopify.com/themes/retina/styles/austin',
    type: 'Paid',
    url: 'https://retina-theme.myshopify.com/',
  },

  mrparker: {
    name: 'Mr Parker',
    download: 'https://themes.shopify.com/themes/mr-parker/styles/wardrobe',
    type: 'Paid',
    url: 'https://mr-parker.myshopify.com/',
  },

  providence: {
    name: 'Providence',
    download: 'https://themes.shopify.com/themes/providence/styles/thunderbolt',
    type: 'Paid',
    url: 'https://thunderbolt-providence.myshopify.com/',
  },

  symmetry: {
    name: 'Symmetry',
    download: 'https://themes.shopify.com/themes/symmetry/styles/salt-yard',
    type: 'Paid',
    url: 'https://salt-yard.myshopify.com/',
  },

  atlantic: {
    name: 'Atlantic',
    download: 'https://themes.shopify.com/themes/atlantic/styles/organic',
    type: 'Paid',
    url: 'https://atlantic-theme-organic.myshopify.com/',
  },

  vantage: {
    name: 'Vantage',
    download: 'https://themes.shopify.com/themes/vantage/styles/clean',
    type: 'Paid',
    url: 'https://wisozk-stroman-and-homenick8737.myshopify.com/',
  },

  mobilia: {
    name: 'Mobilia',
    download: 'https://themes.shopify.com/themes/mobilia/styles/milan',
    type: 'Paid',
    url: 'https://mobilia-theme-milan.myshopify.com/',
  },

  ella: {
    name: 'Ella',
    download:
      'https://themeforest.net/item/ella-responsive-shopify-template/9691007',
    type: 'Paid',
    url: 'https://new-ella-demo-11.myshopify.com/',
  },

  dawn: {
    name: 'Dawn',
    download: 'https://themes.shopify.com/themes/dawn/styles/default',
    type: 'Free',
    url: 'https://dawn-theme-default.myshopify.com/',
  },

  refresh: {
    name: 'Refresh',
    download: 'https://themes.shopify.com/themes/refresh/styles/default',
    type: 'Free',
    url: 'https://theme-refresh-demo.myshopify.com/',
  },

  ride: {
    name: 'Ride',
    download: 'https://themes.shopify.com/themes/ride/styles/default',
    type: 'Free',
    url: 'https://theme-ride-demo.myshopify.com/',
  },

  studio: {
    name: 'Studio',
    download: 'https://themes.shopify.com/themes/studio/styles/default/preview',
    type: 'Free',
    url: 'https://theme-studio-demo.myshopify.com',
  },

  colorblock: {
    name: 'Colorblock',
    download: 'https://themes.shopify.com/themes/colorblock/styles/default',
    type: 'Free',
    url: 'https://theme-colorblock-demo.myshopify.com/',
  },
  crave: {
    name: 'Crave',
    download: 'https://themes.shopify.com/themes/crave/styles/default',
    type: 'Free',
    url: 'https://theme-crave-demo.myshopify.com/',
  },

  sense: {
    name: 'Sense',
    download: 'https://themes.shopify.com/themes/sense/styles/default',
    type: 'Free',
    url: 'https://theme-sense-demo.myshopify.com/',
  },

  taste: {
    name: 'Taste',
    download: 'https://themes.shopify.com/themes/taste/styles/default',
    type: 'Free',
    url: 'https://theme-taste-demo.myshopify.com/',
  },

  craft: {
    name: 'Craft',
    download: 'https://themes.shopify.com/themes/craft/styles/default',
    type: 'Free',
    url: 'https://theme-craft-demo.myshopify.com/',
  },

  booster: {
    name: 'Booster',
    download: 'https://www.boostertheme.com/',
    type: 'Paid',
    url: 'https://boosterfashion.myshopify.com/',
  },

  creative: {
    name: 'Creative',
    download: 'https://themes.shopify.com/themes/creative/styles/chalk',
    type: 'Paid',
    url: 'https://creative-theme-chalk.myshopify.com/',
  },

  modules: {
    name: 'Modules',
    download: 'https://themes.shopify.com/themes/modules/styles/sky',
    type: 'Paid',
    url: 'https://aberne.myshopify.com/',
  },

  whisk: {
    name: 'Whisk',
    download: 'https://themes.shopify.com/themes/whisk/styles/soft',
    type: 'Paid',
    url: 'https://whisk-theme-soft.myshopify.com/',
  },

  emporium: {
    name: 'Emporium',
    download: 'https://themes.shopify.com/themes/emporium/styles/coffee',
    type: 'Paid',
    url: 'https://emporium-theme-coffee.myshopify.com/',
  },

  effortless: {
    name: 'Effortless',
    download: 'https://themes.shopify.com/themes/effortless/styles/default',
    description:
      'A quick-start premium theme with an effortless shopping experience.',
    url: 'https://effortless-theme-demo.myshopify.com/',
    type: 'Paid',
  },

  combine: {
    name: 'Combine',
    download: 'https://themes.shopify.com/themes/combine/styles/beauty',
    description:
      'Bundle products & increase average order value, sales & revenue',
    url: 'https://bundle-theme-demo.myshopify.com/',
    type: 'Paid',
  },

  publisher: {
    name: 'Publisher',
    download: 'https://themes.shopify.com/themes/publisher/styles/default',
    description:
      'An avant-garde theme inspired by independent studios and publishers.',
    url: 'https://theme-publisher-demo.myshopify.com/',
    type: 'Free',
  },
  origin: {
    name: 'Origin',
    download: 'https://themes.shopify.com/themes/origin/styles/default',
    description: 'A stylish theme designed for makers selling unique pieces',
    url: 'https://theme-origin-demo.myshopify.com/',
    type: 'Free',
  },
  handmade: {
    name: 'Handmade',
    download: 'https://themes.shopify.com/themes/handmade/styles/dusty-brown',
    description:
      'A theme for jewelry & accessory crafters, lifestyle brands, and DIYers',
    url: 'https://handmade-demo.myshopify.com',
    type: 'Paid',
  },
  erickson: {
    name: 'Erickson',
    download: 'https://themes.shopify.com/themes/erickson/styles/erickson',
    description:
      'A flexible & modern theme designed to accelerate your online business',
    url: 'https://whileymai-dev-new.myshopify.com',
    type: 'Paid',
  },

  banjo: {
    name: 'Banjo',
    download: 'https://themes.shopify.com/themes/banjo/styles/creative',
    description:
      'Flexible, easy to use and focused on an elegant user experience.',
    url: 'https://banjo-default.myshopify.com/',
    type: 'Paid',
  },
  reformation: {
    name: 'Reformation',
    download: 'https://themes.shopify.com/themes/reformation/styles/default',
    description: 'Feature-packed, high-performant Shopify theme',
    url: 'https://reformation-main.myshopify.com/',
    type: 'Paid',
  },

  upscale: {
    name: 'Upscale',
    download: 'https://themes.shopify.com/themes/upscale/styles/gem',
    description: 'A premium theme supercharged with features and flexibility',
    url: 'https://upscale-theme-gem.myshopify.com/',
    type: 'Paid',
  },
  paper: {
    name: 'Paper',
    download: 'https://themes.shopify.com/themes/paper/styles/poster',
    description:
      'A feature-rich theme designed for both large and small catalogs',
    url: 'https://paperthemedemo2.myshopify.com/',
    type: 'Paid',
  },

  impact: {
    name: 'Impact',
    download: 'https://themes.shopify.com/themes/impact/styles/sound',
    description: 'A colored, typography-oriented theme for impactful brands',
    url: 'https://impact-theme-sound.myshopify.com',
    type: 'Paid',
  },

  zest: {
    name: 'Zest',
    download: 'https://themes.shopify.com/themes/zest/styles/flairy',
    description: 'A flexible and modern design to win mobile conversion',
    url: 'https://zest-flairy.myshopify.com/',
    type: 'Paid',
  },

  mode: {
    name: 'Mode',
    download: 'https://themes.shopify.com/themes/mode/styles/horizon',
    description:
      'Feature-packed and fast, hand-crafted for growth and large inventories',
    url: 'https://mode-theme-horizon.myshopify.com/',
    type: 'Paid',
  },

  xtra: {
    name: 'Xtra',
    download: 'https://themes.shopify.com/themes/xtra/styles/maximum',
    description:
      'A versatile theme fit for every industry built for boosting conversion',
    url: 'https://xtra-warehouse.myshopify.com/',
    type: 'Paid',
  },

  mandolin: {
    name: 'Mandolin',
    download: 'https://themes.shopify.com/themes/mandolin/styles/neat',
    description:
      'Flexible, easy to use and focused on an elegant user experience.',
    url: 'https://mandolin-neat.myshopify.com',
    type: 'Paid',
  },

  yuva: {
    name: 'Yuva',
    download: 'https://themes.shopify.com/themes/yuva/styles/amaze',
    description:
      'Modern yet elegant theme to best showcase your product catalog.',
    url: 'https://yuva-theme-amaze.myshopify.com/',
    type: 'Paid',
  },

  local: {
    name: 'Local',
    download: 'https://themes.shopify.com/themes/local/styles/light',
    description:
      'Create a cohesive experience for your customers, online and in person',
    url: 'https://local-theme-light-demo.myshopify.com',
    type: 'Paid',
  },

  pursuit: {
    name: 'Pursuit',
    download: 'https://themes.shopify.com/themes/pursuit/styles/aspen',
    description:
      'A bold theme for medium-large merchants who want to make a statement',
    url: 'https://pursuit-outdoor.myshopify.com/',
    type: 'Paid',
  },
  stiletto: {
    name: 'Stiletto',
    download: 'https://themes.shopify.com/themes/stiletto/styles/vogue',
    description: 'A luxury Shopify theme optimized for growth',
    url: 'https://stiletto-theme-vogue.myshopify.com/',
    type: 'Paid',
  },

  chord: {
    name: 'Chord',
    download: 'https://themes.shopify.com/themes/chord/styles/warm',
    description:
      'Flexible, easy to use and focused on an elegant user experience.',
    url: 'https://chord-warm.myshopify.com/',
    type: 'Paid',
  },
  forge: {
    name: 'Forge',
    download: 'https://themes.shopify.com/themes/forge/styles/platinum',
    description:
      'A product focused theme with unique set selling features and options',
    url: 'https://forge-theme-demo.myshopify.com/',
    type: 'Paid',
  },
  athens: {
    name: 'Athens',
    download: 'https://themes.shopify.com/themes/athens/styles/default',
    description: 'Designed to host even the most demanding product inventories',
    url: 'https://athens-theme.myshopify.com/',
    type: 'Paid',
  },
  habitat: {
    name: 'Habitat',
    download: 'https://themes.shopify.com/themes/habitat/styles/merino',
    description: 'The natural environment for your products',
    url: 'https://habitat-crafts.myshopify.com/',
    type: 'Paid',
  },
  minion: {
    name: 'Minion',
    download: 'https://themes.shopify.com/themes/minion/styles/vertical',
    description:
      'Ideal for the pet industry. With flexible features to fit more niches',
    url: 'https://minion-theme-vertical.myshopify.com/',
    type: 'Paid',
  },
  stockholm: {
    name: 'Stockholm',
    download: 'https://themes.shopify.com/themes/stockholm/styles/default',
    description: 'A clean and minimalist Shopify theme',
    url: 'https://stockholm-demo.myshopify.com/',
    type: 'Paid',
  },
  influence: {
    name: 'Influence',
    download: 'https://themes.shopify.com/themes/influence/styles/default',
    description:
      'Fashion focused with creative storytelling and powerful navigation',
    url: 'https://influence-theme.myshopify.com/',
    type: 'Paid',
  },
  andaman: {
    name: 'Andaman',
    download: 'https://themes.shopify.com/themes/andaman/styles/default',
    description:
      'Based on minimalist design, typography and product storytelling.',
    url: 'https://bakery-theme-v1.myshopify.com',
    type: 'Paid',
  },
  shapes: {
    name: 'Shapes',
    download: 'https://themes.shopify.com/themes/shapes/styles/neon',
    description: 'A retro inspired theme for energetic brands.',
    url: 'https://shapes-theme-soda.myshopify.com/',
    type: 'Paid',
  },
  mojave: {
    name: 'Mojave',
    download: 'https://themes.shopify.com/themes/mojave/styles/mojave',
    description:
      'Contemporary design with proven functionality that converts to sales.',
    url: 'https://mojave-theme.myshopify.com/',
    type: 'Paid',
  },
  north: {
    name: 'North',
    download: 'https://themes.shopify.com/themes/north/styles/default',
    description: "Create a web presence you're proud of",
    url: 'https://north-original.myshopify.com/',
    type: 'Paid',
  },
  tailor: {
    name: 'Tailor',
    download: 'https://themes.shopify.com/themes/tailor/styles/cotton',
    description: 'Tailor-made for fashion brands with a story to tell.',
    url: 'https://tailor-theme-cotton.myshopify.com/',
    type: 'Paid',
  },
  bullet: {
    name: 'Bullet',
    download: 'https://themes.shopify.com/themes/bullet/styles/default',
    description: 'Minimal grid based theme for contemporary brands.',
    url: 'https://bullet1-openthinking.myshopify.com/',
    type: 'Paid',
  },
  beYours: {
    name: 'Be Yours',
    download: 'https://themes.shopify.com/themes/be-yours/styles/beauty',
    description:
      'Create super fast responsive websites with an amazing user experience.',
    url: 'https://beyours-theme-beauty.myshopify.com/',
    type: 'Paid',
  },
  drop: {
    name: 'Drop',
    download: 'https://themes.shopify.com/themes/drop/styles/countdown',
    description:
      'Product release focused for optimized audience anticipation and hype',
    url: 'https://drop-theme-countdown-demo.myshopify.com/',
    type: 'Paid',
  },
  beyond: {
    name: 'Beyond',
    download: 'https://themes.shopify.com/themes/beyond/styles/essentials',
    description:
      'Designed for ethical brands envisioning a more sustainable future',
    url: 'https://beyond-theme-4.myshopify.com/',
    type: 'Paid',
  },
  foodie: {
    name: 'Foodie',
    download: 'https://themes.shopify.com/themes/foodie/styles/grind',
    description: 'A versatile conversion focused theme for small inventories',
    url: 'https://foodie-theme-coffee.myshopify.com/',
    type: 'Paid',
  },
  spark: {
    name: 'Spark',
    download: 'https://themes.shopify.com/themes/spark/styles/chic',
    description:
      'For direct-to-consumer brands, drop-shippers and first-time merchants',
    url: 'https://spark-theme-chic.myshopify.com/',
    type: 'Paid',
  },
  baseline: {
    name: 'Baseline',
    download: 'https://themes.shopify.com/themes/baseline/styles/bold',
    description: 'A typography focused theme designed for the unconventional',
    url: 'https://baseline-theme-bold.myshopify.com/',
    type: 'Paid',
  },
  avatar: {
    name: 'Avatar',
    download: 'https://themes.shopify.com/themes/avatar/styles/royal',
    description:
      'A modern, clean theme, designed to increase your average order value',
    url: 'https://avatar-shirts.myshopify.com/',
    type: 'Paid',
  },
  fresh: {
    name: 'Fresh',
    download: 'https://themes.shopify.com/themes/fresh/styles/sweet',
    description:
      'A clean and versatile theme designed for food and drink stores',
    url: 'https://fresh-theme-sweet.myshopify.com',
    type: 'Paid',
  },
  //next = upscale
};

export function resolveThemeFromShopifyName(name) {
  if (!name || typeof name !== 'string') return null;
  const normalized = name.trim().toLowerCase();
  if (themes[normalized]) return themes[normalized];
  for (const key of Object.keys(themes)) {
    if (themes[key].name.toLowerCase() === normalized) {
      return themes[key];
    }
  }
  const compact = normalized.replace(/[^a-z0-9]/g, '');
  if (compact && themes[compact]) return themes[compact];
  return null;
}

export function buildFallbackThemeRecord(displayName) {
  return {
    name: displayName || 'unknown',
    url: 'https://themes.shopify.com/',
    download: 'https://themes.shopify.com/',
    type: 'Unknown',
  };
}

function detectTheme() {
  let theme = { name: 'unknown' };

  const getThemeName = () =>
    window.BOOMR && window.BOOMR.themeName.trim().toLowerCase();

  const isDebut = (() => {
    let $navbar = document.querySelector(
      `.site-header [class='site-header__icons-wrapper'] [class*='site-header__cart'] > svg,
      .site-header [class='site-header__icons-wrapper'] > button.site-header__icon`
    );

    if ($navbar) {
      return (theme = themes.debut);
    }
  })();

  const isNarrative = (() => {
    let $navbar = document.querySelector(
      `nav.site-header__section > [class*='navigation'] + .navigation,
      .site-header[data-section-id] .site-header__section > [class*='navigation'] > span[class*='burger'] + span[class*='burger'] + span[class*='burger']`
    );

    if ($navbar) {
      return (theme = themes.narrative);
    }
  })();

  const isExpress = (() => {
    let $navbar = document.querySelector(
      `button > .header__cart-indicator > svg > path[d]`
    );

    if ($navbar) {
      return (theme = themes.express);
    }
  })();

  const isVenture = (() => {
    let $navbar = document.querySelector(
      `header[class] div + div > #SiteNavSearchCart`
    );
    if ($navbar) {
      return (theme = themes.venture);
    }
  })();

  const isBoundless = (() => {
    let $navbar = document.querySelector(
      `.site-header-container > [id*='header'] > style + header > .grid > .grid__item + .grid__item [aria-controls="CartDrawer"] > .icon-cart`
    );

    if ($navbar) {
      return (theme = themes.boundless);
    }
  })();

  const isSimple = (() => {
    let $navbar = document.querySelector(
      `[id*='section-header'] .top-bar > div + .grid__item svg[viewBox*='20 20']`
    );

    if ($navbar) {
      return (theme = themes.simple);
    }
  })();

  const isBrooklyn = (() => {
    let $navbar = document.querySelector(
      `.site-header .medium-down--hide .site-nav .site-nav__item [class*='fallback'] span`
    );

    if ($navbar) {
      return (theme = themes.brooklyn);
    }
  })();

  const isSupply = (() => {
    let $navbar = document.querySelector(
      `header.site-header  + .header-cart-btn [class*='icon-cart'],
      html[class] body[class] header.site-header[role] form[action*='search'] ~ ul,
      body[id] header.site-header  + #mobileNavBar + .nav-bar[role] .site-nav,
      body[id] header.site-header form > input:nth-child(2) + button >span:nth-child(2)`
    );

    if ($navbar) {
      return (theme = themes.supply);
    }
  })();

  const isMinimal = (() => {
    let $navbar = document.querySelector(
      `#shopify-section-header style + div .header-bar + .site-header [class*='display-table'],
      #shopify-section-header style + div .header-bar > * > * >  [class^='header-bar__'],
      .header-bar .header-bar__right > .header-bar__module span + a[class*='cart-page'] > span`
    );

    if ($navbar) {
      return (theme = themes.minimal);
    }
  })();

  const isHighlight = (() => {
    let $navbar = document.querySelector(
      `header.header-holder .menu-meta [class*='menu-meta'] svg`
    );

    if ($navbar) {
      return (theme = themes.isHighlight);
    }
  })();

  const isExpanse = (() => {
    let $navbar = document.querySelector(
      `#SiteHeader[data-overlay] .header-layout [id*='Header']`
    );

    if ($navbar) {
      return (theme = themes.expanse);
    }
  })();

  const isStreamline = (() => {
    let $body = document.querySelector(
      `body[data-type_header_capitalize][data-animate_images][data-transitions] [class*='thumb-menu']`
    );

    if ($body) {
      return (theme = themes.streamline);
    }
  })();

  const isWarehouse = (() => {
    let $element = document.querySelector(
      `body[class^='warehouse'] header[class*='--']`
    );

    if ($element) {
      return (theme = themes.warehouse);
    }
  })();

  const isContext = (() => {
    let $navbar = document.querySelector(
      `section[data-navigation] svg + [class*='indicator']`
    );

    if ($navbar) {
      return (theme = themes.context);
    }
  })();

  const isBroadcast = (() => {
    let $header = document.querySelector(
      `.header__mobile .header__mobile__button:nth-child(2) svg[viewBox*='8']`
    );

    if ($header) {
      return (theme = themes.broadcast);
    }
  })();

  const isAvenue = (() => {
    let $element = document.querySelector(
      `#header-navigation .table .main-menu nav [role*='menubar'][aria-label]`
    );

    if ($element) {
      return (theme = themes.avenue);
    }
  })();

  const isStory = (() => {
    let $element = document.querySelector(
      `[data-aos-easing] .header--touch > .header svg.icon[viewBox*='20 ']`
    );

    if ($element) {
      return (theme = themes.story);
    }
  })();

  const isBoost = (() => {
    let $element = document.querySelector(
      `.docking-header[role] .docked-navigation-container > [class*='docked-navigation-container'] [class*='header'], 
          .page-header .store-logo + [class*='utils'] [class*='utils']`
    );

    if ($element) {
      return (theme = themes.boost);
    }
  })();

  const isCascade = (() => {
    let $element = document.querySelector(
      `#shopify-section-header header > .header__main .max-site-width.px2`
    );

    if ($element) {
      return (theme = themes.cascade);
    }
  })();

  const isImpulse = (() => {
    let $element = document.querySelector(
      `body[data-aos-duration] .transition-body style + [data-section-id="header"]`
    );

    if ($element) {
      return (theme = themes.impulse);
    }
  })();

  const isArtisan = (() => {
    let $element = document.querySelector(
      `.shopify-section.header-section .topBar > .topBar__container [class*='--mobile']`
    );

    if ($element) {
      return (theme = themes.artisan);
    }
  })();

  const isPrestige = (() => {
    let $element = document.querySelector(
      `body[class^='prestige--'] [class*='PageSkip'],
          body.template-index .PageSkipLink + .LoadingBar + .PageOverlay + .PageTransition`
    );

    if ($element) {
      return (theme = themes.prestige);
    }
  })();

  const isReach = (() => {
    let $element = document.querySelector(
      `[class*='site-navigation-layout-'] .navmenu[class*='depth']`
    );

    if ($element) {
      return (theme = themes.reach);
    }
  })();

  const isGalleria = (() => {
    let $element = document.querySelector(
      `.nav-container-inner > .nav-container-logo + .nav-container-controls[id*='nav']`
    );

    if ($element) {
      return (theme = themes.galleria);
    }
  })();

  const isModular = (() => {
    let $element = document.querySelector(
      `body[class] .pageWrap [data-section-type="header"][class*='--'] [class*='nav-item']`
    );

    if ($element) {
      return (theme = themes.modular);
    }
  })();

  const isMotion = (() => {
    let $element = document.querySelector(
      `body[data-transitions] #PageContainer [class*='header'][class*='--'] .header-item`
    );

    if ($element) {
      return (theme = themes.motion);
    }
  })();

  const isSplit = (() => {
    let $element = document.querySelector(
      `#shopify-section-header [class*='desktop-view'] .count-holder > *`
    );

    if ($element) {
      return (theme = themes.split);
    }
  })();

  const isEmpire = (() => {
    let $element = document.querySelector(
      `.site-header .site-header-cart--button [data-header-cart-count] + svg[focusable]`
    );

    if ($element) {
      return (theme = themes.empire);
    }
  })();

  const isVenue = (() => {
    let $element = document.querySelector(
      `body[class*='theme-loaded'] style + .mobile-draw [class*='wrapper']`
    );

    if ($element) {
      return (theme = themes.venue);
    }
  })();

  const isEmerge = (() => {
    let $element = document.querySelector(
      `body[data-theme-version] > [class*='off-canvas'] > [class*='off-canvas'] +  [class*='off-canvas']`
    );

    if ($element) {
      return (theme = themes.emerge);
    }
  })();

  const isEditorial = (() => {
    let $element = document.querySelector(
      `body > svg[style] + #PageContainer [class*='header_'] #CartCount`
    );

    if ($element) {
      return (theme = themes.editorial);
    }
  })();

  const isHandy = (() => {
    let $element = document.querySelector(
      `script + [class*='site-header'] [class^='site-actions'] svg + span[data-cart-item-count]`
    );

    if ($element) {
      return (theme = themes.handy);
    }
  })();

  const isTrademark = (() => {
    let $element = document.querySelector(
      `body[class^='trademark--'] [class*='header__'] [class*='hidden-pocket']`
    );

    if ($element) {
      return (theme = themes.trademark);
    }
  })();

  const isCapital = (() => {
    let $element = document.querySelector(
      `body[data-aos-duration][class*='focus'] .main-header script + .header-wrapper`
    );

    if ($element) {
      return (theme = themes.capital);
    }
  })();

  const isVogue = (() => {
    let $element = document.querySelector(
      `body[class*='sidebar-always'] #shopify-section-header + .content-wrapper + script`
    );

    if ($element) {
      return (theme = themes.vogue);
    }
  })();

  const isFlow = (() => {
    let $element = document.querySelector(
      `body[id][class] #DrawerOverlay + #PageContainer > #shopify-section-header #NavDrawer[class] + header`
    );

    if ($element) {
      return (theme = themes.flow);
    }
  })();

  const isLorenza = (() => {
    let $element = document.querySelector(
      `html[style*='--header'] body[class] [class*='quick-cart__'] [class*='quick-cart__'],
      
      body > header > #shopify-section-header > script + [data-navigation*='{'],
      html[class][style] > body[id] > #shopify-section-header + #mainWrap
      `
    );

    if ($element) {
      return (theme = themes.lorenza);
    }
  })();

  const isLaunch = (() => {
    let $element = document.querySelector(
      `body[class][style] .header-actions-list a[tabindex="0"] > .header-cart-count,
          body[class][style] #PageContainer[class] header[class] .wrapper a[href*='cart'][tabindex]`
    );

    if ($element) {
      return (theme = themes.launch);
    }
  })();

  const isIra = (() => {
    let $element = document.querySelector(
      `html[style*='height-header'] .page header[style]  [class*='ff'] [class*='header__']`
    );

    if ($element) {
      return (theme = themes.ira);
    }
  })();

  const isPaloAlto = (() => {
    let $element = document.querySelector(
      `body[class][id] [class*='site-header--'][data-nav-position] .space-maker`
    );

    if ($element) {
      return (theme = themes.palo_alto);
    }
  })();

  const isMaker = (() => {
    let $element = document.querySelector(
      `body[data-theme-version][data-theme-name] a[class*='header--cart'] > [class*='cart--']`
    );

    if ($element) {
      return (theme = themes.maker);
    }
  })();

  const isLabel = (() => {
    let $element = document.querySelector(
      `html[class][style] > body[id][class] .headerInnerWrap .cart-user-box #CartCount + svg`
    );

    if ($element) {
      return (theme = themes.label);
    }
  })();

  const isPipeline = (() => {
    let $element = document.querySelector(
      `body[id][class] .header__wrapper[data-header-sticky] .mobile-wrapper .header-logo a,
          body[id][class] #shopify-section-header > div + script[type="application/ld+json"] + script[type="application/ld+json"],
          body[id][class] [id*='footer'] + script#JsQty + script#JsQty--cart`
    );

    if ($element) {
      return (theme = themes.pipeline);
    }
  })();

  const isColors = (() => {
    let $element = document.querySelector(
      `body[id][class]  .header > .bar > .left + .right + .center`
    );

    if ($element) {
      return (theme = themes.colors);
    }
  })();

  const isKagami = (() => {
    let $element = document.querySelector(
      `body[class^='kagami--'] > svg[style]`
    );

    if ($element) {
      return (theme = themes.kagami);
    }
  })();

  const isDistrict = (() => {
    let $element = document.querySelector(
      `#page #shopify-section-header .site-header-wrapper .site-header[data-scroll-lock] > .wrapper .logo-contain + .nav-bar `
    );

    if ($element) {
      return (theme = themes.district);
    }
  })();

  const isCanopy = (() => {
    let $element = document.querySelector(
      `#page-wrap-inner[style] #page-wrap-content .container .page-header [id*='toolbar'] > [class*='toolbar']`
    );

    if ($element) {
      return (theme = themes.canopy);
    }
  })();

  const isKingdom = (() => {
    let $element = document.querySelector(
      `#shopify-section-sidebar > .sidebar[style] .sidebar__container [class*='sidebar'][style] .logo`
    );

    if ($element) {
      return (theme = themes.kingdom);
    }
  })();

  const isGrid = (() => {
    let $element = document.querySelector(
      `#shopify-section-header > script[data-section-type='static-header'] + .header [class*='branding'] > [class*='logo']`
    );

    if ($element) {
      return (theme = themes.grid);
    }
  })();

  const isShowtime = (() => {
    let $element = document.querySelector(
      `.overlapblackbg + #shopify-section-header [class*='header_'] [class*='navbar-'] a[data-href]`
    );

    if ($element) {
      return (theme = themes.showtime);
    }
  })();

  const isFocal = (() => {
    let $element = document.querySelector(
      `body[class*='focal--'] > svg[style]`
    );

    if ($element) {
      return (theme = themes.focal);
    }
  })();

  const isPacific = (() => {
    let $element = document.querySelector(
      `.main-header-wrapper > .main-header[role] .branding + .header-tools span[class*='bag'],
          .main-header-wrapper > .main-header[role] .branding[data-header-branding]  .site-title-logo`
    );

    if ($element) {
      return (theme = themes.pacific);
    }
  })();

  const isCalifornia = (() => {
    let $element = document.querySelector(
      `.hero[class*='height'][data-section-id] [class*='header'] > .icon[data-action]`
    );

    if ($element) {
      return (theme = themes.california);
    }
  })();

  const isIcon = (() => {
    let $element = document.querySelector(
      `#shopify-section-header > header[class][data-sticky] > .topbar + div .nav-container[class*='desktop'],
          .gridlock[class*='shifter'] aside + .site-wrap #navigation [class*='auto'],
          .gridlock[class*='shifter'] [class*='shifter'] [class*='gridlock-'] [class*='desktop']`
    );

    if ($element) {
      return (theme = themes.icon);
    }
  })();

  const isParallax = (() => {
    let $element = document.querySelector(
      `body[data-money-format] [class^='mm'] [id^='mm'] [class^='mm'] [class^='mm'] [class*='mm-listitem']`
    );

    if ($element) {
      return (theme = themes.parallax);
    }
  })();

  const isShowcase = (() => {
    let $element = document.querySelector(
      `body[style*='padding'] [class*='site-control'] + [class*='nav-'] [data-cc-animate-click]`
    );

    if ($element) {
      return (theme = themes.showcase);
    }
  })();

  const isAlchemy = (() => {
    let $element = document.querySelector(
      `body[id][class] #pageheader.pageheader [class*='pageheader__'] .logo[class*='logo--']`
    );

    if ($element) {
      return (theme = themes.alchemy);
    }
  })();

  const isStartup = (() => {
    let $element = document.querySelector(
      `.main-header-wrapper > header.main-header .branding noscript[data-rimg-noscript],
          .main-header-wrapper > header.main-header .branding a > img[class*='logo-']`
    );

    if ($element) {
      return (theme = themes.startup);
    }
  })();

  const isTestament = (() => {
    let $element = document.querySelector(
      `html[class*='supports-'] body.gridlock #panel header + .header-wrapper + style,
          body.gridlock .site-wrap header + .header-wrapper[class*='js-'] + style`
    );

    if ($element) {
      return (theme = themes.testament);
    }
  })();

  const isBlockshop = (() => {
    let $element = document.querySelector(
      `body[data-theme-name="Blockshop"][data-theme-version],
          body[data-theme-name="blockshop"][data-theme-version],
          html.js.localstorage[style] [class*='header--'] [class*='header--'] [role] [class*='logo']`
    );

    if ($element) {
      return (theme = themes.blockshop);
    }
  })();

  const isRetina = (() => {
    let $element = document.querySelector(
      `body.index.feature_image #content_wrapper #header > [href="#nav"] + [href="#cart"],
        body.index.feature_image #header[class*='mm'] > [href="#nav"] + [href="#cart"],
        body[style*='--utility'] .site-header .site-header__wrapper nav + .header-controls`
    );

    if ($element) {
      return (theme = themes.retina);
    }
  })();

  const isMrparker = (() => {
    let $element = document.querySelector(
      `body[data-aos-duration] [class*='header__mobile__cart'] .cart-links__wrapper .cart-links__item,
          body[data-aos-duration] #mobile-logo + #cart[class*='tablet-'] .cart-name,
          body[class] #CartDrawer + [class*='shifter'] > * .header-section [class^='header'] `
    );

    if ($element) {
      return (theme = themes.mrparker);
    }
  })();

  const isProvidence = (() => {
    let $element = document.querySelector(
      `html.svgclippaths [class*='small-'] .table #branding-wrap #brand-primary-image,
          html.svgclippaths.indexeddb.webworkers .shop-identity-tagline .tagline,
          html.svgclippaths.indexeddb.webworkers #app-header .table .cell .brand [class*='hidden']`
    );

    if ($element) {
      return (theme = themes.providence);
    }
  })();

  const isSymmetry = (() => {
    let $element = document.querySelector(
      `#pageheader.pageheader[class*='--'] [class*='logo-area'] + [class*='logo-area'] .logo [itemprop="logo"],
          #pageheader .logo-area .header-disclosures + .cart-summary .cart-count__text`
    );

    if ($element) {
      return (theme = themes.symmetry);
    }
  })();

  const isAtlantic = (() => {
    let $element = document.querySelector(
      `[class*='header-'] > section .action-links.clearfix [class*='main-header--'] + [class*='store-'],
          body[class] .main-header > [class*='header-'] nav[class*='main-header--'] .first`
    );

    if ($element) {
      return (theme = themes.atlantic);
    }
  })();

  const isVantage = (() => {
    let $element = document.querySelector(
      `  html.supports-fontface #cart[class*='header__'] svg[width][height],
          html.supports-fontface #cart .mini-cart-trigger + #mini-cart #ajaxifyMini > *`
    );

    if ($element) {
      return (theme = themes.vantage);
    }
  })();

  const isFashionopolism = (() => {
    let $element = document.querySelector(
      `body > aside[id] + div[class]>div[class]>.content-wrapper`
    );

    if ($element) {
      return (theme = themes.fashionopolism);
    }
  })();

  const isTurbo = (() => {
    let $element = document.querySelector(
      `body[data-money-format][data-shop-url] #header details[data-mobile-menu] > summary,
      body[data-money-format][data-shop-url] #header .top_bar ul,
      body[data-money-format][data-shop-url] #header .top-bar ul,
      body div[class] + #header + * .header .top_bar ul,
      body[data-money-format] #header .top_bar a[id] ~ * ul,
      body[data-money-format] #header .top_bar span + span + span,
      [class] > [class] > .top_bar > .social_icons ~ div + ul`
    );

    if ($element) {
      return (theme = themes.turbo);
    }
  })();

  const isSuperstore = (() => {
    let $element = document.querySelector(
      `body[data-instant-allow-query-string] .skip-to-main ~ [data-modal-container]`
    );

    if ($element) {
      return (theme = themes.superstore);
    }
  })();

  const isElla = (() => {
    let $element = document.querySelector(
      `body[id][data-url-lang] .wrapper-container [class*='footbar']`
    );

    if ($element) {
      return (theme = themes.ella);
    }
  })();

  const isDawnOrDawnVariant = (() => {
    let $element = document.querySelector(
      `header-drawer details summary[class*='header'] svg`
    );

    if (!$element) {
      return;
    }

    const boomr = getBoomrObject();
    if (!boomr.theme || typeof boomr.theme !== 'string') {
      return;
    }

    const _theme = boomr.theme.toLowerCase().trim();

    if (_theme === 'dawn') {
      return (theme = themes.dawn);
    } else if (_theme === 'refresh') {
      return (theme = themes.refresh);
    } else if (_theme === 'ride') {
      return (theme = themes.ride);
    } else if (_theme === 'studio') {
      return (theme = themes.studio);
    } else if (_theme === 'crave') {
      return (theme = themes.crave);
    } else if (_theme === 'taste') {
      return (theme = themes.taste);
    } else if (_theme === 'craft') {
      return (theme = themes.craft);
    } else if (_theme === 'publisher') {
      return (theme = themes.publisher);
    } else if (_theme === 'origin') {
      return (theme = themes.origin);
    } else {
      return (theme = themes.dawn);
    }
  })();

  const isBooster = (() => {
    let $element = document.querySelector(
      `.container [class*='booster__'],
      input#product_key`
    );

    if ($element) {
      return (theme = themes.booster);
    }
  })();

  const isCreative = (() => {
    let $element = document.querySelector(
      `body[id] .js-section__header > header[role][id][data-header-style] > [class*='trigger']`
    );

    if ($element) {
      return (theme = themes.creative);
    }
  })();

  const isModules = (() => {
    let $element = document.querySelector(
      `html[style*='h'] [id*='header'] > [id*='header'] > [class*='flex']`
    );

    if ($element) {
      return (theme = themes.modules);
    }
  })();

  const isWhisk = (() => {
    let $element = document.querySelector(
      `[id*='header'] + aside + cart-notification [class*='notification']`
    );

    if ($element) {
      return (theme = themes.whisk);
    }
  })();

  const isEmporium = (() => {
    let $element = document.querySelector(
      `body > div[hidden] ~ [id*='header'] ~ #shopify-section-cart-drawer [id*='cart']`
    );

    if ($element) {
      return (theme = themes.emporium);
    }
  })();

  const isEffortless = (() => {
    let $element = document.querySelector(
      `body[class*='--'] style ~ * .header > [class*='__'] + [class*='__'] > [id] svg g[clip-path]`
    );

    if ($element) {
      return (theme = themes.effortless);
    }
  })();

  const isCombine = (() => {
    let $element = document.querySelector(
      `body[class*='-'] [data-shopify] ~ main-header + [class*='sidebar']`
    );

    if ($element) {
      return (theme = themes.combine);
    }
  })();

  const isHandmade = (() => {
    let $element = document.querySelector(
      `html[lang].js:not([id]) [class*='header'][class*='header--'] > [class*='offcanvas']`
    );

    if ($element) {
      return (theme = themes.handmade);
    }
  })();

  const isErickson = (() => {
    let $element = document.querySelector(
      `body[id] [id*='aside'] + * #primary-mobile-nav`
    );

    if ($element) {
      return (theme = themes.erickson);
    }
  })();

  const isBanjo = (() => {
    let $element = document.querySelector(
      `html[style*='--tg'] .Header[class*='--'] [style] [class*='Header__']`
    );

    if ($element) {
      return (theme = themes.banjo);
    }
  })();

  const isReformation = (() => {
    let $element = document.querySelector(
      `html[style*='--header'] #wrapper [id*='header'] ~ #Product`
    );

    if ($element) {
      return (theme = themes.reformation);
    }
  })();

  const isUpscale = (() => {
    let $element = document.querySelector(
      `header > loess-header.section[role][class*='header'] [is]`
    );

    if ($element) {
      return (theme = themes.upscale);
    }
  })();

  const isPaper = (() => {
    let $element = document.querySelector(
      `html[x-init*='()'] [id*='header'] [x-data]`
    );

    if ($element) {
      return (theme = themes.paper);
    }
  })();

  const isImpact = (() => {
    let $element = document.querySelector(
      `html[class][dir] template + a + aside + header height-observer`
    );

    if ($element) {
      return (theme = themes.impact);
    }
  })();

  const isZest = (() => {
    let $element = document.querySelector(
      `html[style] body[class] header[data-header-transparent]`
    );

    const value = getCSSVariablesValues();

    if ($element && value === '0px#eeeeee50%') {
      return (theme = themes.zest);
    }
  })();

  const isMode = (() => {
    let $element = document.querySelector(
      `[id*='header'] > style + [data-cc-animate] + script[id]`
    );

    if ($element) {
      return (theme = themes.mode);
    }
  })();

  const isXtra = (() => {
    let $element = document.querySelector(
      `html[class][data-theme] #root main#content`
    );

    if ($element) {
      return (theme = themes.xtra);
    }
  })();

  const isMandolin = (() => {
    let $element = document.querySelector(
      `html[style][class] body[class] [class*='Loading'] ~ [id*='header'] #Header[style] > [style]`
    );

    if ($element) {
      return (theme = themes.mandolin);
    }
  })();

  const isYuva = (() => {
    let $element = document.querySelector(
      `html[class] body[style][class] .body-wrapper .wrapper [class^='yv-']`
    );

    if ($element) {
      return (theme = themes.yuva);
    }
  })();

  const isLocal = (() => {
    let $element = document.querySelector(
      `html[class] body[id][class] [id*='header'] main-header + sidebar-drawer[style] > [class^='sidebar__'] +[class^='sidebar__'] `
    );

    if ($element) {
      return (theme = themes.local);
    }
  })();

  const isPursuit = (() => {
    let $element = document.querySelector(
      `html[class][style] body[class] #PageContainer ~ .mobile_menu_overlay ~ [id][class].Drawer`
    );

    if ($element) {
      return (theme = themes.pursuit);
    }
  })();

  const isStiletto = (() => {
    let $element = document.querySelector(
      `html[class][style] body[class] .page header.header[data-navigation-position]`
    );

    if ($element) {
      return (theme = themes.stiletto);
    }
  })();

  const isChord = (() => {
    let $element = document.querySelector(
      `html[class][style] body[class] [id*='drawer'] > #CartDrawer.Drawer[data-section-settings]`
    );

    if ($element) {
      return (theme = themes.chord);
    }
  })();

  const isForge = (() => {
    let $element = document.querySelector(
      `html[class][style] body[id][class] .site-wrap #shopify-section-mobile-header [class^='mobile-header__cart'] + [class^='mobile-header__cart'] `
    );

    if ($element) {
      return (theme = themes.forge);
    }
  })();

  const isAthens = (() => {
    let $element = document.querySelector(
      `html:not([id]) body:not([id]) #header [class^='navigation-'] + [class*='utilities'] [class*='mobile']`
    );

    if ($element) {
      return (theme = themes.athens);
    }
  })();

  const isHabitat = (() => {
    let $element = document.querySelector(
      `html > body[class] #wrapper .cart-drawer [class*='side-panel'] > [class*='side-panel'] `
    );

    if ($element) {
      return (theme = themes.habitat);
    }
  })();

  const isMinion = (() => {
    let $element = document.querySelector(
      `html[data-role] > body:not([class]):not([id]) [data-menu-in-content] `
    );

    if ($element) {
      return (theme = themes.minion);
    }
  })();

  const isStockholm = (() => {
    let $element = document.querySelector(
      `.header-wrapper[class*='--'] .header[class*='--'] > header-drawer + h1 + nav[class*='__'] + [class] [class*='localization']`
    );

    if ($element) {
      return (theme = themes.stockholm);
    }
  })();

  const isInfluence = (() => {
    let $element = document.querySelector(
      `html[class][data-headings-size][data-headings-case][data-headings-line-height][style] > body[class] safe-load-scripts`
    );

    if ($element) {
      return (theme = themes.influence);
    }
  })();

  const isAndaman = (() => {
    let $element = document.querySelector(
      `html[class][style] #page > #main > #page-content > #header-sections`
    );

    if ($element) {
      return (theme = themes.andaman);
    }
  })();

  const isShapes = (() => {
    let $element = document.querySelector(
      `html[style][class] body[data-color-scheme] [x-init] > [id^='headerBorder'] > #headerContainer .flex nav > ul[class]`
    );

    if ($element) {
      return (theme = themes.shapes);
    }
  })();

  const isMojave = (() => {
    let $element = document.querySelector(
      `html[style] body[class] #shopify-section-header h1 + sticky-header[data-enable-sticky-header] > header`
    );

    if ($element) {
      return (theme = themes.mojave);
    }
  })();

  const isNorth = (() => {
    let $element = document.querySelector(
      `html body:not([id]) #wrapper #side-cart[role][class] > header > h6`
    );

    if ($element) {
      return (theme = themes.north);
    }
  })();

  const isTailor = (() => {
    let $element = document.querySelector(
      `html[class] template ~ [id*='header'][style] > section[data-component][data-is-sticky]`
    );

    if ($element) {
      return (theme = themes.tailor);
    }
  })();

  const isBullet = (() => {
    let $element = document.querySelector(
      `body[style] > #app  > [id*='header'] script + style ~ [data-cart-view] ~#header `
    );

    if ($element) {
      return (theme = themes.bullet);
    }
  })();

  const isBeYours = (() => {
    let $element = document.querySelector(
      `html[class][style] body[data-lazy-image] [id*='header'] ~#shopify-section-mobile-dock mobile-dock`
    );

    if ($element) {
      return (theme = themes.beYours);
    }
  })();

  const isDrop = (() => {
    let $element = document.querySelector(
      `html[class] body[id] aside + main.site-wrap > [id*='header'] > [data-asset-url] section >article`
    );

    if ($element) {
      return (theme = themes.drop);
    }
  })();

  const isBeyond = (() => {
    let $element = document.querySelector(
      `html[class][dir] body[class][data-assets-loaded] off-canvas-root`
    );

    if ($element) {
      return (theme = themes.beyond);
    }
  })();

  const isFoodie = (() => {
    let $element = document.querySelector(
      `html:not([id]) > body[id][class] .section-header[data-asset-url]`
    );
    const value = getCSSVariablesValues();

    if ($element && value === '1px1px-1pxdashed1px') {
      return (theme = themes.foodie);
    }
  })();

  const isSpark = (() => {
    let $element = document.querySelector(
      `html[class][style] body[data-enable-quick-cart][data-enable-page-transitions][data-show-secondary-image-on-hover] [data-enable-sticky-header]`
    );

    if ($element) {
      return (theme = themes.spark);
    }
  })();

  const isBaseline = (() => {
    let $element = document.querySelector(
      `html[class][style] body[id][class] [x-data] ~ .relative ~ #screenreader-announce[aria-live]`
    );

    if ($element) {
      return (theme = themes.baseline);
    }
  })();

  const isAvatar = (() => {
    let $element = document.querySelector(
      `body:not([id]):not([class]) #shopify-section-header > [data-section-id][data-section-settings] .header > .container [class*='flex']`
    );

    if ($element) {
      return (theme = themes.avatar);
    }
  })();

  const isFresh = (() => {
    let $element = document.querySelector(
      `html[class] > body[id][class] [data-cart-type] > aside + #main-body [id*='header'] > style + div`
    );

    if ($element) {
      return (theme = themes.fresh);
    }
  })();

  return theme;
}

/**
 *
 * Gets all CSS variables containing "-radius" and returns a string w/ their results.
 */
function getCSSVariablesValues() {
  const _cssVariables = Array.from(document.styleSheets)
    .filter(
      (sheet) =>
        sheet.href === null || sheet.href.startsWith(window.location.origin)
    )
    .reduce(
      (acc, sheet) =>
        (acc = [
          ...acc,
          ...Array.from(sheet.cssRules).reduce(
            (def, rule) =>
              (def =
                rule.selectorText === ':root'
                  ? [
                      ...def,
                      ...Array.from(rule.style).filter((name) =>
                        name.startsWith('--')
                      ),
                    ]
                  : def),
            []
          ),
        ]),
      []
    );

  const cssVariables = _cssVariables
    .filter((e) => e.includes('-radius') || e.includes('border'))
    .sort();

  const value = cssVariables
    .map((e) =>
      getComputedStyle(document.documentElement).getPropertyValue(e).trim()
    )
    .join('');

  return value;
}
export default detectTheme;
