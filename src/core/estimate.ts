// Macro ESTIMATES for dishes with no published nutrition. Owner's decision (Nov 11): when a number is unknown,
// show an estimate, always labeled as one. Rules that never change:
//   - An estimate never replaces a published value (official file, entered by you, Eat UNC). It only fills gaps.
//   - Estimates never feed diet, allergy or avoid rules. They affect only nutrition numbers and ranking by targets.
//   - Every estimate says what it was based on (reference food + assumed serving), and the site always marks it.
// Reference values are typical per-100 g figures for common foods in the style of USDA FoodData Central
// (SR Legacy / FNDDS), written from general knowledge of those tables, not looked up item by item: the build
// environment could not reach fdc.nal.usda.gov. Serving sizes are typical dining-hall portions, tuned against the
// dishes whose calories and protein Eat UNC does publish (see test/estimate.test.ts for the measured error).
import type { MenuItem } from './types.ts';
import { norm } from './foods.ts';

export interface Ref { label: string; kcal: number; p: number; f: number; c: number }   // per 100 g
export interface Estimate {
  calories: number; protein: number; fat: number; carbs: number;
  ref: string;           // reference food, e.g. "chicken breast, roasted"
  grams: number;         // assumed serving
  matchedBy: 'name' | 'ingredients';
  basis: string;         // one plain sentence for the page
}

// Typical values per 100 g (cooked/prepared as served). Approximate; see the note at the top.
const R: Record<string, Ref> = {
  chicken: { label: 'chicken, roasted', kcal: 190, p: 29, f: 7.5, c: 0 },
  chickenBreast: { label: 'chicken breast, roasted', kcal: 165, p: 31, f: 3.6, c: 0 },
  friedChicken: { label: 'breaded fried chicken', kcal: 270, p: 19, f: 15, c: 13 },
  wings: { label: 'chicken wings, sauced', kcal: 280, p: 24, f: 19, c: 3 },
  turkey: { label: 'turkey, roasted', kcal: 150, p: 29, f: 3, c: 0 },
  deliMeat: { label: 'sliced deli meat', kcal: 110, p: 17, f: 3.5, c: 3 },
  beef: { label: 'beef, cooked', kcal: 230, p: 27, f: 13, c: 0 },
  groundBeef: { label: 'ground beef, cooked', kcal: 250, p: 25, f: 16, c: 0 },
  pork: { label: 'pork loin, roasted', kcal: 200, p: 27, f: 9.5, c: 0 },
  pulledPork: { label: 'pulled pork, barbecue', kcal: 210, p: 18, f: 9, c: 14 },
  ribs: { label: 'pork ribs, barbecue', kcal: 290, p: 21, f: 20, c: 7 },
  bacon: { label: 'bacon, cooked', kcal: 540, p: 37, f: 42, c: 1.4 },
  sausage: { label: 'sausage, cooked', kcal: 300, p: 14, f: 26, c: 2 },
  ham: { label: 'ham', kcal: 145, p: 21, f: 5.5, c: 1.5 },
  salmon: { label: 'salmon, baked', kcal: 205, p: 22, f: 12, c: 0 },
  whiteFish: { label: 'white fish (cod, tilapia, catfish), baked', kcal: 130, p: 25, f: 3, c: 0 },
  friedFish: { label: 'breaded fried fish', kcal: 230, p: 15, f: 12, c: 15 },
  shrimp: { label: 'shrimp, cooked', kcal: 100, p: 24, f: 0.5, c: 0.2 },
  tuna: { label: 'tuna salad', kcal: 190, p: 16, f: 12, c: 4 },
  chickenSalad: { label: 'chicken salad (with mayonnaise)', kcal: 230, p: 15, f: 18, c: 3 },
  tofu: { label: 'tofu, firm, cooked', kcal: 145, p: 15, f: 9, c: 3 },
  crispyTofu: { label: 'tofu, breaded or glazed', kcal: 210, p: 12, f: 11, c: 15 },
  plantMeat: { label: 'plant-based meat substitute', kcal: 230, p: 17, f: 14, c: 8 },
  egg: { label: 'egg, hard-boiled', kcal: 155, p: 13, f: 11, c: 1.1 },
  scrambled: { label: 'scrambled eggs', kcal: 150, p: 10, f: 11, c: 1.6 },
  beans: { label: 'beans, cooked', kcal: 130, p: 8.5, f: 0.6, c: 23 },
  bakedBeans: { label: 'baked beans', kcal: 140, p: 5, f: 0.5, c: 25 },
  chickpeas: { label: 'chickpeas, cooked', kcal: 165, p: 9, f: 2.6, c: 27 },
  lentils: { label: 'lentils, cooked', kcal: 115, p: 9, f: 0.4, c: 20 },
  edamame: { label: 'edamame', kcal: 120, p: 12, f: 5, c: 9 },
  hummus: { label: 'hummus', kcal: 170, p: 8, f: 10, c: 14 },
  rice: { label: 'white rice, cooked', kcal: 130, p: 2.7, f: 0.3, c: 28 },
  brownRice: { label: 'brown rice, cooked', kcal: 123, p: 2.7, f: 1, c: 26 },
  friedRice: { label: 'fried rice', kcal: 165, p: 5, f: 6, c: 22 },
  pasta: { label: 'pasta, cooked', kcal: 158, p: 5.8, f: 0.9, c: 31 },
  pastaDish: { label: 'pasta with sauce', kcal: 150, p: 6, f: 4.5, c: 21 },
  creamyPasta: { label: 'pasta in cream or cheese sauce', kcal: 190, p: 7.5, f: 8, c: 22 },
  macCheese: { label: 'macaroni and cheese', kcal: 165, p: 6.5, f: 6.6, c: 20 },
  noodles: { label: 'stir-fried noodles', kcal: 150, p: 5.5, f: 4.5, c: 22 },
  grains: { label: 'grain (quinoa, couscous, bulgur, barley), cooked', kcal: 120, p: 4.2, f: 1.5, c: 22 },
  grits: { label: 'grits or polenta, cooked', kcal: 75, p: 1.5, f: 2, c: 13 },
  oatmeal: { label: 'oatmeal, cooked', kcal: 75, p: 2.5, f: 1.5, c: 13 },
  potato: { label: 'potatoes, roasted', kcal: 140, p: 2.5, f: 5, c: 21 },
  mashed: { label: 'mashed potatoes', kcal: 115, p: 2, f: 4.5, c: 17 },
  fries: { label: 'french fries', kcal: 310, p: 3.4, f: 15, c: 41 },
  hashBrowns: { label: 'hash browns', kcal: 260, p: 3, f: 15, c: 30 },
  sweetPotato: { label: 'sweet potatoes, roasted', kcal: 110, p: 2, f: 3, c: 21 },
  bread: { label: 'bread', kcal: 265, p: 9, f: 3.5, c: 49 },
  bagel: { label: 'bagel', kcal: 255, p: 10, f: 1.6, c: 50 },
  tortilla: { label: 'flour tortilla', kcal: 300, p: 8, f: 7, c: 50 },
  pancake: { label: 'pancakes', kcal: 230, p: 6.4, f: 9.7, c: 28 },
  waffle: { label: 'waffles', kcal: 290, p: 8, f: 14, c: 33 },
  frenchToast: { label: 'french toast', kcal: 230, p: 7.7, f: 11, c: 25 },
  muffin: { label: 'muffin', kcal: 375, p: 5, f: 17, c: 52 },
  pastry: { label: 'pastry or croissant', kcal: 410, p: 7, f: 22, c: 46 },
  cookie: { label: 'cookie', kcal: 480, p: 5, f: 23, c: 65 },
  cake: { label: 'cake, brownie or bar', kcal: 410, p: 4.5, f: 19, c: 57 },
  pie: { label: 'pie', kcal: 260, p: 2.5, f: 12, c: 37 },
  cereal: { label: 'breakfast cereal', kcal: 380, p: 7, f: 3, c: 83 },
  pizza: { label: 'pizza', kcal: 265, p: 11, f: 10, c: 33 },
  burger: { label: 'hamburger on a bun', kcal: 260, p: 14, f: 12, c: 24 },
  sandwich: { label: 'sandwich', kcal: 230, p: 12, f: 9, c: 25 },
  grilledCheese: { label: 'grilled cheese sandwich', kcal: 330, p: 12, f: 17, c: 32 },
  burrito: { label: 'burrito', kcal: 200, p: 8.5, f: 7, c: 26 },
  taco: { label: 'taco', kcal: 210, p: 9, f: 11, c: 19 },
  quesadilla: { label: 'quesadilla', kcal: 290, p: 13, f: 15, c: 25 },
  bowl: { label: 'rice or grain bowl with protein', kcal: 145, p: 8, f: 4.5, c: 18 },
  stirFry: { label: 'stir-fry', kcal: 120, p: 8, f: 5, c: 10 },
  curry: { label: 'curry', kcal: 135, p: 8, f: 7, c: 10 },
  casserole: { label: 'casserole or bake', kcal: 160, p: 8, f: 8, c: 14 },
  potPie: { label: 'pot pie', kcal: 215, p: 7.5, f: 12, c: 20 },
  lasagna: { label: 'lasagna or stuffed pasta', kcal: 160, p: 9, f: 7, c: 15 },
  sushi: { label: 'sushi roll', kcal: 140, p: 4.5, f: 3, c: 24 },
  soup: { label: 'broth or vegetable soup', kcal: 60, p: 2, f: 1.2, c: 5.5 },
  creamSoup: { label: 'cream soup or chowder', kcal: 85, p: 3, f: 4.5, c: 8 },
  chili: { label: 'chili with beans', kcal: 110, p: 8, f: 4.5, c: 10 },
  hash: { label: 'breakfast hash', kcal: 150, p: 6, f: 7, c: 15 },
  vegetables: { label: 'vegetables, cooked', kcal: 50, p: 2, f: 2, c: 7 },
  greens: { label: 'leafy greens, cooked', kcal: 40, p: 2.5, f: 2, c: 4.5 },
  salad: { label: 'green salad, no dressing', kcal: 20, p: 1.2, f: 0.3, c: 3.5 },
  dressedSalad: { label: 'prepared salad (pasta, potato or slaw)', kcal: 150, p: 3, f: 9, c: 15 },
  corn: { label: 'corn, cooked', kcal: 100, p: 3.4, f: 2, c: 21 },
  peas: { label: 'green peas, cooked', kcal: 84, p: 5.4, f: 0.2, c: 16 },
  rawVeg: { label: 'raw vegetables', kcal: 20, p: 1, f: 0.2, c: 4 },
  fruit: { label: 'fresh fruit', kcal: 55, p: 0.7, f: 0.2, c: 14 },
  banana: { label: 'banana', kcal: 89, p: 1.1, f: 0.3, c: 23 },
  yogurt: { label: 'flavored yogurt', kcal: 95, p: 4.5, f: 1.2, c: 17 },
  greekYogurt: { label: 'Greek yogurt', kcal: 75, p: 9, f: 1.5, c: 6 },
  cottage: { label: 'cottage cheese', kcal: 98, p: 11, f: 4.3, c: 3.4 },
  cheese: { label: 'cheese', kcal: 390, p: 23, f: 32, c: 2 },
  iceCream: { label: 'ice cream', kcal: 210, p: 3.5, f: 11, c: 24 },
  pudding: { label: 'pudding or bread pudding', kcal: 180, p: 4, f: 6, c: 28 },
  condiment: { label: 'condiment (salsa, hot sauce, soy sauce, mustard)', kcal: 50, p: 2, f: 0.5, c: 9 },
  slaw: { label: 'slaw', kcal: 70, p: 1, f: 3.5, c: 9 },
  chips: { label: 'potato or tortilla chips', kcal: 536, p: 7, f: 35, c: 53 },
  friedSide: { label: 'fried side (onion rings, hush puppies)', kcal: 300, p: 4.5, f: 17, c: 34 },
  friedVeg: { label: 'battered fried vegetables', kcal: 160, p: 3, f: 8, c: 19 },
  veggiePatty: { label: 'bean or veggie patty', kcal: 180, p: 7, f: 6, c: 25 },
  overnightOats: { label: 'overnight oats or chia pudding', kcal: 140, p: 4.5, f: 4.5, c: 21 },
  whipped: { label: 'whipped topping', kcal: 260, p: 1, f: 20, c: 18 },
  dressing: { label: 'salad dressing', kcal: 400, p: 1, f: 40, c: 8 },
  sauce: { label: 'sauce or gravy', kcal: 90, p: 2, f: 5, c: 9 },
  sweetSauce: { label: 'syrup, jam or sweet sauce', kcal: 260, p: 0.3, f: 0.2, c: 65 },
  nuts: { label: 'nuts or seeds', kcal: 590, p: 20, f: 50, c: 20 },
  juice: { label: 'fruit juice or lemonade', kcal: 47, p: 0.4, f: 0.1, c: 11.5 },
  milk: { label: 'milk', kcal: 50, p: 3.4, f: 2, c: 4.8 },
  plantMilk: { label: 'plant milk', kcal: 40, p: 1.5, f: 1.8, c: 4 },
};

// Rules on the dish NAME, most specific first. [pattern, reference, grams]
const NAME: Array<[RegExp, keyof typeof R, number]> = [
  [/\b(coffee|tea|soda|water|creamer|seltzer|cola|espresso|latte)$/, 'juice', 0],   // drinks and creamer: no estimate
  [/\b(juice|lemonade|punch)$/, 'juice', 240],
  [/\b(oat|almond|soy|coconut|rice) ?milk$/, 'plantMilk', 240],
  [/\bmilk$/, 'milk', 240],
  [/\b(oil and vinegar|dressing|vinaigrette|ranch|aioli|mayo|mayonnaise)$/, 'dressing', 30],
  [/\b(whipped topping|whipped cream)$/, 'whipped', 10],
  [/\b(syrup|jam|jelly|honey|compote|glaze|brown sugar|sugar)$/, 'sweetSauce', 25],
  [/\b(salsa|hot sauce|sriracha|sriracha sauce|soy sauce|mustard|ketchup|tamari|pico de gallo)$/, 'condiment', 25],
  [/\b(sauce|gravy|marinade|queso)$/, 'sauce', 45],
  [/\b(potato chips|tortilla chips|chips)$/, 'chips', 28],
  [/\b(sprinkles|m ?& ?ms|crumbs|chocolate chips|marshmallows?|gummy|gummies|bears in a cup|candy)\b/, 'cookie', 15],
  [/\b(almonds?|walnuts?|pecans?|peanuts?|seeds|granola|toasted coconut)$/, 'nuts', 30],
  [/\bice cream\b|\bgelato\b|\bsorbet\b/, 'iceCream', 70],
  [/\b(overnight (chia )?oats|chia pudding|overnight chia)\b/, 'overnightOats', 200],
  [/\b(pudding|cobbler|crisp)\b/, 'pudding', 120],
  [/\b(cookies?|snickerdoodle|macaroons?)\b/, 'cookie', 27],
  [/\b(brownies?|blondies?|bars?|cakes?|cupcakes?|cheesecake|bread pudding|banana bread|pound cake|coffee cake|quick ?bread|loaf|mocha cups)\b/, 'cake', 40],
  [/\b(pies?|tarts?)\b/, 'pie', 110],
  [/\b(muffins?|scones?|biscuits?|cornbread)\b/, 'muffin', 80],
  [/\b(croissants?|cruffins?|danish|danishes|cinnamon rolls?|donuts?|doughnuts?|turnovers?|pastr(y|ies))\b/, 'pastry', 70],
  [/\bbagels?\b/, 'bagel', 105],
  [/\b(cereal|cheerios|krispies|flakes|chex|loops|charms)\b/, 'cereal', 30],
  [/\boatmeal\b|\bporridge\b/, 'oatmeal', 240],
  [/\bfrench toast\b/, 'frenchToast', 135],
  [/\bpancakes?\b/, 'pancake', 115],
  [/\bwaffles?\b/, 'waffle', 75],
  [/\bpizza\b/, 'pizza', 90],
  [/\bgrilled cheese\b/, 'grilledCheese', 140],
  [/\b(black bean|veggie|vegetable|bean) (burger|patty|patties)\b/, 'veggiePatty', 70],
  [/\b(hamburger|hot dog|hoagie|sub|sandwich|slider|brioche|kaiser) (bun|roll)s?\b/, 'bread', 60],
  [/\b(patty|patties)\b/, 'groundBeef', 85],
  [/(burgers?|sliders?)\b/, 'burger', 190],
  [/\b(cheesesteak|sandwich|sub|hoagie|po ?boy|melt|wrap|panini|gyro|club)\b/, 'sandwich', 140],
  [/\bburritos?\b/, 'burrito', 250],
  [/\bquesadillas?\b/, 'quesadilla', 180],
  [/\b(tacos?|tostadas?|fajitas?)\b/, 'taco', 110],
  [/\b(sushi|maki|roll)\b(?!.*\b(egg|spring|cinnamon|dinner|kaiser|hoagie)\b)/, 'sushi', 60],
  [/\bchili\b(?! (lime|garlic|crisp|oil))/, 'chili', 245],
  [/\b(chowder|bisque|cream of|potato soup|cheese soup|cheddar.*soup)\b/, 'creamSoup', 245],
  [/\b(soup|stew|gumbo|pho|ramen broth)\b/, 'soup', 245],
  [/\bpot pie\b/, 'potPie', 225],
  [/\b(lasagna|manicotti|ravioli|tortellini|stuffed shells|stuffed .*shells)\b/, 'lasagna', 225],
  [/\bmac(aroni)? ?(and|&|n)? ?cheese\b/, 'macCheese', 170],
  [/\b(alfredo|carbonara|cream sauce|scampi)\b/, 'creamyPasta', 225],
  [/\b(lo mein|chow mein|pad thai|noodle|noodles|yakisoba|udon|ramen)\b/, 'noodles', 225],
  [/\bfried rice\b/, 'friedRice', 175],
  [/\b(bowl|plate|arroz con pollo|jambalaya|paella|biryani)\b/, 'bowl', 340],
  [/\b(curry|masala|korma|tikka|vindaloo)\b/, 'curry', 245],
  [/\b(stir ?fry|stir fried|stirfry)\b/, 'stirFry', 225],
  [/\b(casserole|bake|baked ziti|strata|enchiladas?)\b/, 'casserole', 225],
  [/\b(penne|spaghetti|linguine|fettuccine|rotini|cavatappi|ziti|orzo|pasta|farfalle|rigatoni)\b/, 'pastaDish', 150],
  [/\b(hash|skillet|papas)\b/, 'hash', 150],
  [/\b(chicken salad)\b/, 'chickenSalad', 113],
  [/\b(tuna salad|tuna)\b/, 'tuna', 113],
  [/\b(slaw|coleslaw|cole slaw)\b/, 'slaw', 60],
  [/\b(pasta salad|potato salad|macaroni salad|bean salad)\b/, 'dressedSalad', 100],
  [/\b(cauliflower|vegetable|veggie) (wings|bites)\b|\b(fried|battered|crispy|buffalo) (cauliflower|zucchini|mushrooms?|green beans|pickles)\b/, 'friedVeg', 120],
  [/\b(onion rings|hush ?puppies|fried okra|tempura)\b/, 'friedSide', 85],
  [/\b(wings?)\b/, 'wings', 130],
  [/\b(fried chicken|chicken tenders|tenders|nuggets|chicken fingers|popcorn chicken|crispy chicken|chicken parm(esan)?|general tso chicken|orange chicken|sesame chicken)\b/, 'friedChicken', 140],
  [/\b(impossible|beyond|plant.based|vegan (chorizo|sausage|burger)|soy nuggets|chik.?n|meatless)\b/, 'plantMeat', 110],
  [/\b(crispy tofu|glazed tofu|general tso tofu|breaded tofu)\b/, 'crispyTofu', 140],
  [/\btofu scramble\b|\btofu\b|\btempeh\b|\bseitan\b/, 'tofu', 140],
  [/\b(scrambled eggs?|egg scramble|omelets?|omelettes?|frittata|quiche)\b/, 'scrambled', 120],
  [/\b(hard.boiled|boiled) eggs?\b|\beggs?\b/, 'egg', 50],
  [/\bbacon\b/, 'bacon', 16],
  [/\b(sausages?|chorizo|kielbasa|bratwurst|andouille)\b/, 'sausage', 60],
  [/\bham\b/, 'ham', 85],
  [/\b(ribs|riblets)\b/, 'ribs', 170],
  [/\b(pulled pork|carnitas|bbq pork)\b/, 'pulledPork', 140],
  [/\b(pork|loin)\b/, 'pork', 113],
  [/\b(meatballs?|meatloaf|ground beef|taco meat|sloppy joe)\b/, 'groundBeef', 113],
  [/\b(beef|steak|brisket|sirloin|pot roast|roast beef|barbacoa|lamb|carne asada|ropa vieja|bulgogi)\b/, 'beef', 85],
  [/\b(turkey)\b/, 'turkey', 113],
  [/\b(salmon)\b/, 'salmon', 113],
  [/\b(fried fish|fish sticks?|battered fish|fish and chips)\b/, 'friedFish', 140],
  [/\b(cod|tilapia|catfish|pollock|swai|flounder|haddock|fish|mahi)\b/, 'whiteFish', 113],
  [/\b(shrimp|prawns?)\b/, 'shrimp', 113],
  [/\b(chicken breast)\b/, 'chickenBreast', 113],
  [/\b(chicken|poultry)\b/, 'chicken', 113],
  [/\b(sliced|deli) (turkey|ham|roast beef|salami|pepperoni)\b|\bsalami\b|\bpepperoni\b/, 'deliMeat', 56],
  [/\bfalafel\b/, 'chickpeas', 100],
  [/\bhummus\b/, 'hummus', 60],
  [/\bedamame\b/, 'edamame', 85],
  [/\bbaked beans\b/, 'bakedBeans', 130],
  [/\b(lentils?|dal|dahl)\b/, 'lentils', 130],
  [/\b(chickpeas?|garbanzos?)\b/, 'chickpeas', 60],
  [/\b(beans|black beans|pinto|refried|ragout)\b/, 'beans', 95],
  [/\bgreek yogurt\b/, 'greekYogurt', 170],
  [/\b(yogurt|parfait)\b/, 'yogurt', 170],
  [/\bcottage cheese\b/, 'cottage', 113],
  [/\b(cheese|cheddar|mozzarella|provolone|swiss|feta|parmesan)\b/, 'cheese', 20],
  [/\b(french fries|fries|tater tots|tots|potato wedges)\b/, 'fries', 90],
  [/\bhash ?browns?\b/, 'hashBrowns', 80],
  [/\bmashed\b.*\bpotato/, 'mashed', 130],
  [/\bsweet potato(es)?\b|\byams?\b/, 'sweetPotato', 120],
  [/\bpotato(es)?\b/, 'potato', 120],
  [/\bfried rice\b/, 'friedRice', 175],
  [/\bbrown rice\b/, 'brownRice', 90],
  [/\brice\b/, 'rice', 90],
  [/\b(quinoa|couscous|bulgur|barley|farro|tabbouleh)\b/, 'grains', 150],
  [/\b(grits|polenta)\b/, 'grits', 245],
  [/\b(bread|roll|rolls|bun|buns|toast|naan|pita|focaccia|baguette)\b/, 'bread', 45],
  [/\btortillas?\b/, 'tortilla', 45],
  [/\bcorn\b(?!bread|starch|meal)/, 'corn', 120],
  [/\bpeas\b/, 'peas', 80],
  [/\b(kale|collards?|collard greens|spinach|chard|greens)\b/, 'greens', 90],
  [/\b(salad|lettuce|romaine|spring mix|arugula|iceberg)\b/, 'salad', 70],
  [/\bbananas?\b/, 'banana', 118],
  [/\b(apples?|oranges?|grapes|berries|blueberries|strawberries|melon|cantaloupe|honeydew|watermelon|pineapple|kiwi|pears?|peaches|mango|fruit|clementines?|raisins)\b/, 'fruit', 150],
  [/\b(roasted|steamed|sauteed|sautéed|grilled|braised|stewed|stir fried|glazed|baked|mashed|creamed|buttered|medley|vegetables|veggies|ratatouille|caponata|blend|spiced|spicy|seasoned|garlic|herb|lemon)\b.*\b(broccoli|cauliflower|carrots?|green beans|brussels( sprouts)?|squash|zucchini|cabbage|okra|asparagus|eggplant|mushrooms?|peppers|vegetables?|veggies|beets?|tomatoes|onions|bok choy|kale|spinach|greens|collards?|cabbage)\b|\b(vegetable medley|roasted vegetables|steamed vegetables|ratatouille|caponata|bok choy)\b/, 'vegetables', 110],
  [/\b(broccoli|cauliflower|carrots?|green beans|brussels|squash|zucchini|cabbage|okra|asparagus|eggplant|mushrooms?|peppers|beets?|tomatoes|onions?|jalapenos?|scallions|olives|pickles|cucumbers?|celery|radish(es)?|sprouts|lettuce|spinach)\b/, 'rawVeg', 30],
];

// Ingredients to skip when looking for the main ingredient (first ingredient that matches a rule wins).
const SKIP_ING = /^(water|salt|sea salt|kosher salt|oil|olive oil|canola oil|vegetable oil|soybean oil|sugar|spices?|seasonings?|garlic|onion|black pepper|pepper|natural flavors?|flavor|vinegar|butter|margarine)$/;

function fromRule(text: string): { key: keyof typeof R; grams: number } | null {
  for (const [re, key, grams] of NAME) if (re.test(text)) return { key, grams };
  return null;
}

/** Estimate one serving. Returns null when nothing sensible matches (drinks, condiments with no rule, oddities).
 *  When the dish's calories ARE published, the estimate is scaled to them, so estimated fat and carbs agree with the
 *  real calories (pass scaleToPublished: false to measure the raw estimator, as the calibration test does). */
export function estimateItem(item: MenuItem, opts: { scaleToPublished?: boolean } = {}): Estimate | null {
  const name = norm(item.name).trim();
  // "Jerk Chicken with Pineapple Salsa" is chicken, not salsa: try the part before "with" first.
  const head = name.split(/ (with|w|over|on) /)[0].trim();
  let hit = (head !== name ? fromRule(head) : null) ?? fromRule(name), matchedBy: Estimate['matchedBy'] = 'name';
  if (!hit && item.ingredients) {
    const parts = item.ingredients.toLowerCase().split(/[,;()\[\]]|\band\b/).map(s => norm(s).trim()).filter(s => s && !SKIP_ING.test(s));
    for (const part of parts.slice(0, 3)) { hit = fromRule(part); if (hit) { matchedBy = 'ingredients'; break; } }
  }
  if (!hit || hit.grams <= 0) return null;
  const r = R[hit.key];
  const pub = item.nutrition.calories;
  const scaled = opts.scaleToPublished !== false && pub !== null && pub !== undefined && pub > 0 && r.kcal > 0;
  const grams = scaled ? Math.round((pub! / r.kcal) * 100) : hit.grams;
  const k = grams / 100;
  const round = (n: number) => Math.round(n);
  const oz = Math.round(grams / 28.35 * 10) / 10;
  const by = matchedBy === 'name' ? 'name' : 'main ingredient';
  return {
    calories: round(r.kcal * k), protein: round(r.p * k), fat: round(r.f * k), carbs: round(r.c * k),
    ref: r.label, grams, matchedBy,
    basis: scaled
      ? `Estimated from the typical make-up of ${r.label} (matched by the dish’s ${by}), scaled to its published ${pub} calories. Not from UNC; real recipes vary.`
      : `Estimated from typical values for ${r.label} and a ${grams} g (about ${oz} oz) serving, matched by the dish’s ${by}. Not from UNC; real portions and recipes vary.`,
  };
}

/** Attach estimates to every item (always recomputed; never touches published values). */
export function attachEstimates(items: Iterable<MenuItem>): number {
  let n = 0;
  for (const it of items) { it.nutrition.estimate = estimateItem(it); if (it.nutrition.estimate) n++; }
  return n;
}

export type MacroKey = 'calories' | 'protein' | 'fat' | 'carbs';
/** The published value if there is one, else the estimate (when allowed), with a flag saying which. */
export function effective(it: MenuItem, k: MacroKey, useEstimates: boolean): { value: number | null; estimated: boolean } {
  const v = it.nutrition[k];
  if (v !== null && v !== undefined) return { value: v, estimated: false };
  const e = useEstimates ? it.nutrition.estimate : null;
  return e ? { value: e[k], estimated: true } : { value: null, estimated: false };
}
