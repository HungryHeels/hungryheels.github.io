// Ingredient lexicons. Matching is on normalized lowercase text with word boundaries.
// Missing ingredient text is NEVER treated as "free of" — see engine.ts.

export type FoodCat =
  | 'meat' | 'poultry' | 'fish' | 'shellfish' | 'dairy' | 'egg' | 'honey'
  | 'grains' | 'legumes' | 'vegetables' | 'fruit' | 'nuts_seeds'
  | 'gluten' | 'wheat' | 'soy' | 'sesame' | 'peanut' | 'tree_nut' | 'pork' | 'alcohol';

export function norm(s: string): string {
  return ' ' + s.toLowerCase().replace(/[™®©]/g, ' ').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
}

const T: Record<FoodCat, string[]> = {
  meat: ['beef', 'steak', 'sirloin', 'brisket', 'veal', 'pork', 'bacon', 'ham', 'sausage', 'sausages', 'pepperoni', 'salami', 'chorizo',
    'prosciutto', 'lamb', 'mutton', 'goat', 'bison', 'venison', 'meatball', 'meatballs', 'meatloaf', 'hot dog', 'hot dogs', 'frankfurter',
    'bologna', 'pastrami', 'corned beef', 'jerky', 'ribs', 'rib', 'pulled pork', 'lard', 'tallow', 'gelatin', 'gelatine', 'carnitas',
    'barbacoa', 'gyro', 'kielbasa', 'bratwurst', 'andouille', 'pancetta', 'capicola', 'mortadella', 'liver', 'beef broth', 'beef stock',
    'pork broth', 'meat', 'burger patty', 'hamburger', 'cheeseburger', 'philly', 'roast beef', 'sloppy joe', 'ground beef', 'taco meat',
    'rendered fat', 'animal fat', 'suet', 'bone broth', 'au jus', 'lamb leg'],
  poultry: ['chicken', 'turkey', 'duck', 'hen', 'poultry', 'goose', 'quail', 'chicken broth', 'chicken stock', 'chicken fat', 'wings', 'nuggets', 'tenders', 'drumstick', 'tinga'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'tilapia', 'anchovy', 'anchovies', 'sardine', 'sardines', 'mahi', 'trout', 'pollock', 'haddock',
    'catfish', 'halibut', 'bass', 'snapper', 'swordfish', 'mackerel', 'herring', 'fish sauce', 'worcestershire', 'surimi', 'eel', 'unagi',
    'caesar dressing', 'fish stock', 'dashi', 'bonito', 'roe', 'caviar', 'tobiko', 'masago'],
  shellfish: ['shrimp', 'prawn', 'prawns', 'crab', 'lobster', 'clam', 'clams', 'oyster', 'oysters', 'mussel', 'mussels', 'scallop', 'scallops',
    'crawfish', 'crayfish', 'squid', 'calamari', 'octopus', 'shellfish', 'krab'],
  dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'whey', 'casein', 'caseinate', 'lactose', 'ghee', 'buttermilk',
    'cheddar', 'mozzarella', 'parmesan', 'ricotta', 'provolone', 'feta', 'swiss', 'gouda', 'brie', 'cottage cheese', 'sour cream', 'custard',
    'ice cream', 'half and half', 'queso', 'alfredo', 'paneer', 'mascarpone', 'gelato', 'kefir', 'curds', 'milkfat', 'cream cheese', 'romano', 'asiago', 'pecorino', 'monterey jack', 'jack cheese', 'colby', 'dairy'],
  egg: ['egg', 'eggs', 'albumen', 'omelet', 'omelette', 'mayonnaise', 'mayo', 'aioli', 'meringue', 'egg white', 'egg yolk', 'frittata', 'quiche', 'hollandaise', 'custard'],
  honey: ['honey'],
  grains: ['rice', 'oat', 'oats', 'oatmeal', 'wheat', 'flour', 'pasta', 'noodle', 'noodles', 'bread', 'bun', 'buns', 'roll', 'rolls', 'bagel',
    'quinoa', 'barley', 'rye', 'couscous', 'bulgur', 'farro', 'corn', 'cornmeal', 'grits', 'polenta', 'tortilla', 'wrap', 'cereal', 'cracker',
    'crackers', 'breading', 'breaded', 'batter', 'pita', 'naan', 'biscuit', 'pancake', 'waffle', 'muffin', 'cake', 'cookie', 'pizza crust',
    'dough', 'semolina', 'macaroni', 'spaghetti', 'penne', 'rotini', 'linguine', 'fettuccine', 'orzo', 'millet', 'sorghum', 'amaranth',
    'cornstarch', 'corn starch', 'tapioca', 'starch', 'croutons', 'crouton', 'sushi', 'gnocchi', 'dumpling', 'ramen', 'udon', 'soba', 'hoagie', 'sourdough', 'toast'],
  legumes: ['bean', 'beans', 'lentil', 'lentils', 'chickpea', 'chickpeas', 'garbanzo', 'pea', 'peas', 'soy', 'soybean', 'soybeans', 'tofu', 'tempeh',
    'edamame', 'hummus', 'falafel', 'peanut', 'peanuts', 'seitan', 'black beans', 'pinto', 'lupin', 'miso', 'natto'],
  vegetables: ['broccoli', 'cauliflower', 'carrot', 'carrots', 'spinach', 'kale', 'lettuce', 'cabbage', 'zucchini', 'squash', 'cucumber', 'tomato',
    'tomatoes', 'pepper', 'peppers', 'onion', 'onions', 'mushroom', 'mushrooms', 'celery', 'asparagus', 'green beans', 'brussels', 'potato',
    'potatoes', 'sweet potato', 'beet', 'beets', 'radish', 'eggplant', 'arugula', 'collard', 'collards', 'chard', 'okra', 'corn on the cob',
    'leek', 'garlic', 'ginger', 'jalapeno', 'jalapenos', 'salad', 'vegetable', 'vegetables', 'veggie', 'veggies', 'slaw', 'bok choy', 'artichoke',
    'pickle', 'pickles', 'olive', 'olives', 'seaweed', 'nori', 'wakame', 'kelp', 'avocado', 'guacamole', 'salsa', 'pico', 'kimchi', 'sauerkraut', 'turnip', 'parsnip', 'plantain', 'scallion', 'scallions', 'cilantro', 'parsley', 'basil'],
  fruit: ['apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'berries', 'berry', 'blueberry', 'blueberries', 'strawberry', 'strawberries',
    'raspberry', 'grape', 'grapes', 'melon', 'cantaloupe', 'watermelon', 'honeydew', 'pineapple', 'mango', 'peach', 'peaches', 'pear', 'pears',
    'plum', 'cherry', 'cherries', 'kiwi', 'lemon', 'lime', 'grapefruit', 'apricot', 'fruit', 'raisin', 'raisins', 'cranberry', 'cranberries',
    'applesauce', 'papaya', 'pomegranate', 'fig', 'figs', 'dates', 'coconut', 'tangerine', 'clementine', 'blackberry', 'blackberries', 'cantaloupe'],
  nuts_seeds: ['almond', 'almonds', 'walnut', 'walnuts', 'pecan', 'pecans', 'cashew', 'cashews', 'pistachio', 'pistachios', 'hazelnut', 'hazelnuts',
    'macadamia', 'peanut', 'peanuts', 'nut', 'nuts', 'seed', 'seeds', 'sunflower', 'pumpkin seeds', 'chia', 'flax', 'flaxseed', 'sesame', 'tahini',
    'pine nut', 'pine nuts', 'brazil nut', 'trail mix', 'granola', 'nutella'],
  gluten: ['gluten', 'wheat', 'barley', 'rye', 'malt', 'semolina', 'spelt', 'farro', 'seitan', 'bulgur', 'couscous', 'durum', 'triticale', 'orzo', 'flour tortilla'],
  wheat: ['wheat', 'flour', 'bread', 'pasta', 'noodle', 'noodles', 'semolina', 'couscous', 'bulgur', 'farro', 'seitan', 'breading', 'breaded', 'bun', 'buns',
    'roll', 'rolls', 'bagel', 'tortilla', 'cracker', 'crackers', 'macaroni', 'spaghetti', 'penne', 'rotini', 'linguine', 'fettuccine', 'orzo', 'pita',
    'naan', 'biscuit', 'pancake', 'waffle', 'muffin', 'cake', 'cookie', 'dough', 'croutons', 'crouton', 'ramen', 'udon', 'hoagie', 'sourdough', 'toast',
    'gnocchi', 'dumpling', 'pizza crust', 'batter', 'gluten', 'spelt', 'durum', 'enriched flour', 'wrap'],
  soy: ['soy', 'soya', 'soybean', 'soybeans', 'tofu', 'tempeh', 'edamame', 'miso', 'natto', 'tamari', 'shoyu', 'soy sauce', 'soy lecithin', 'soybean oil', 'teriyaki', 'hoisin'],
  sesame: ['sesame', 'tahini', 'benne'],
  peanut: ['peanut', 'peanuts', 'groundnut', 'groundnuts', 'peanut butter', 'arachis'],
  tree_nut: ['almond', 'almonds', 'walnut', 'walnuts', 'pecan', 'pecans', 'cashew', 'cashews', 'pistachio', 'pistachios', 'hazelnut', 'hazelnuts',
    'macadamia', 'pine nut', 'pine nuts', 'brazil nut', 'brazil nuts', 'praline', 'marzipan', 'nutella', 'chestnut', 'chestnuts', 'tree nut', 'tree nuts'],
  pork: ['pork', 'bacon', 'ham', 'prosciutto', 'pancetta', 'pepperoni', 'salami', 'chorizo', 'sausage', 'sausages', 'lard', 'carnitas', 'bologna', 'hot dog', 'hot dogs', 'gelatin', 'gelatine', 'capicola', 'mortadella', 'kielbasa', 'bratwurst', 'andouille', 'pulled pork', 'ribs'],
  alcohol: ['wine', 'beer', 'rum', 'bourbon', 'whiskey', 'vodka', 'brandy', 'liqueur', 'sherry', 'sake', 'mirin', 'cooking wine', 'marsala', 'vermouth', 'amaretto', 'alcohol', 'lager', 'stout', 'cider vinegar wine', 'bitters'],
};

// Phrases that contain a lexicon word but are NOT that food. Removed before matching.
export const SAFE_PHRASES: string[] = [
  'coconut milk', 'coconut cream', 'coconut butter', 'coconut oil', 'almond milk', 'oat milk', 'oatmilk', 'soy milk', 'soymilk', 'rice milk', 'peamilk', 'pea milk',
  'cashew milk', 'hemp milk', 'plant based milk', 'nut milk', 'milk chocolate', 'cocoa butter', 'shea butter', 'peanut butter', 'almond butter', 'sunflower butter',
  'seed butter', 'apple butter', 'butternut', 'butter bean', 'butter beans', 'butter lettuce', 'butterhead', 'cream of tartar', 'cream of wheat', 'ice cream cone',
  'eggplant', 'egg roll', 'egg noodle', 'egg noodles', 'nutmeg', 'buckwheat', 'water chestnut', 'water chestnuts', 'sweet corn', 'corn syrup', 'high fructose corn syrup',
  'corn oil', 'soybean oil', 'soy lecithin', 'sunflower lecithin', 'peppercorn', 'black pepper', 'white pepper', 'red pepper flakes', 'pepper flakes', 'cayenne pepper',
  'ground pepper', 'chili pepper', 'rice vinegar', 'wine vinegar', 'red wine vinegar', 'white wine vinegar', 'balsamic vinegar', 'cider vinegar', 'apple cider vinegar',
  'lemon juice', 'lime juice', 'orange juice', 'lemon zest', 'lime zest', 'lemon pepper', 'garlic powder', 'onion powder', 'ginger powder', 'tomato paste',
  'cocoa', 'cacao', 'vegan butter', 'vegan cheese', 'vegan mayo', 'vegan mayonnaise', 'vegan cream cheese', 'vegan sour cream', 'dairy free', 'dairy-free', 'non dairy',
  'nondairy', 'egg free', 'egg replacer', 'plant based', 'bell pepper', 'bell peppers', 'sweet potato fries', 'hot sauce', 'chicken of the woods', 'sunflower oil',
  'hamburger bun', 'hot dog bun', 'ham radio', 'sesame oil', 'almond flour', 'coconut flour', 'rice flour', 'corn flour', 'chickpea flour', 'oat flour', 'tapioca flour',
  'potato starch', 'corn starch', 'cornstarch', 'tapioca starch', 'rice starch', 'modified food starch', 'modified corn starch', 'food starch', 'rice bran', 'rice bran oil', 'rice flour',
  'cream of mushroom', 'turmeric', 'pumpkin pie spice', 'mace', 'star anise', 'caraway seed', 'cumin seed', 'fennel seed', 'celery seed', 'mustard seed', 'coriander seed', 'poppy seed',
  'vegetable color', 'vegetable colour', 'vegetable juice', 'vegetable juice for color', 'vegetable gum', 'vegetable glycerin', 'vegetable enzymes', 'vegetable shortening',
  'vegetable mono and diglycerides', 'carob bean gum', 'locust bean gum', 'vanilla bean', 'vanilla beans', 'vanilla bean seeds', 'cocoa bean', 'cocoa beans', 'coffee bean', 'salad oil',
  'salad dressing', 'dill seed', 'anise seed', 'cardamom', 'coriander', 'cumin', 'rice paper', 'plantain chips', 'sunflower seed butter', 'sunbutter', 'oat beverage', 'rice beverage', 'non fat dry milk free',
];

// Incidental seasoning-level ingredients. Ignored when judging "plant evidence" for carnivore
// (a steak seared in oil with salt, pepper and onion powder is still treated as an animal food).
// This is the app's own editable default.
export const SEASONING_PHRASES: string[] = [
  'salt', 'sea salt', 'kosher salt', 'pepper', 'black pepper', 'spice', 'spices', 'seasoning', 'seasonings', 'natural flavor', 'natural flavors', 'natural flavoring',
  'artificial flavor', 'flavor', 'flavors', 'flavoring', 'garlic powder', 'onion powder', 'garlic', 'onion', 'paprika', 'oregano', 'thyme', 'rosemary', 'sage', 'parsley',
  'basil', 'dill', 'chili powder', 'cumin', 'coriander', 'turmeric', 'cayenne', 'red pepper', 'herbs', 'herb', 'vinegar', 'citric acid', 'lactic acid', 'ascorbic acid',
  'sugar', 'cane sugar', 'dextrose', 'corn syrup', 'maltodextrin', 'oil', 'olive oil', 'canola oil', 'vegetable oil', 'soybean oil', 'sunflower oil', 'corn oil', 'palm oil',
  'extra virgin olive oil', 'water', 'sodium phosphate', 'sodium phosphates', 'sodium nitrite', 'sodium erythorbate', 'potassium chloride', 'lemon juice concentrate',
  'lemon juice', 'cultured celery powder', 'celery powder', 'celery juice powder', 'carrageenan', 'xanthan gum', 'guar gum', 'tocopherols', 'caramel color', 'paprika extract',
  'spice extractives', 'smoke flavor', 'natural smoke flavor', 'yeast extract', 'monosodium glutamate', 'msg', 'modified food starch', 'potato starch', 'potato dextrin',
  'sodium diacetate', 'sodium lactate', 'sodium acetate', 'calcium chloride', 'sodium bicarbonate', 'baking soda', 'mustard', 'black pepper', 'pepper', 'ground black pepper',
  'lemon', 'lime', 'cilantro', 'chives', 'bay leaf', 'bay leaves', 'ginger', 'nutmeg', 'cinnamon', 'cloves', 'allspice', 'mustard flour', 'mustard seed', 'parsley flakes',
  'dried garlic', 'dried onion', 'granulated garlic', 'granulated onion', 'rosemary extract', 'bacteria culture', 'cultures', 'enzymes', 'ammonium chloride',
];

// Vague wording: an animal source or allergen could hide in it.
export const VAGUE_PHRASES: string[] = [
  'natural flavor', 'natural flavors', 'natural flavoring', 'artificial flavor', 'artificial flavors', 'flavoring', 'flavorings', 'seasoning', 'seasonings', 'spices',
  'spice', 'broth', 'stock', 'bouillon', 'base', 'gravy', 'enzymes', 'enzyme', 'mono and diglycerides', 'monoglycerides', 'diglycerides', 'glycerides', 'shortening',
  'natural and artificial flavors', 'flavor', 'flavors', 'extractives', 'vegetable broth', 'color', 'colors', 'protein', 'lecithin',
];

const cache = new Map<FoodCat, RegExp>();
export function lexRegex(cat: FoodCat): RegExp {
  let r = cache.get(cat);
  if (!r) {
    const terms = [...new Set(T[cat])].sort((a, b) => b.length - a.length).map(t => t.replace(/ /g, '\\s+'));
    r = new RegExp('(?:^|\\s)(' + terms.join('|') + ')(?=s?\\s|$)', 'g');
    cache.set(cat, r);
  }
  return r;
}

const OIL_RUN = /(?:^|\s)(?:(?:soybean|soy|canola|corn|sunflower|cottonseed|safflower|palm|olive|vegetable|high oleic|andor|and or|and|or|extra virgin|evoo|rapeseed|coconut)\s+)+oils?(?:\s+blend)?(?=\s|$)/g;
const safeRe = new RegExp('(?:^|\\s)(' + [...SAFE_PHRASES].sort((a, b) => b.length - a.length).map(p => norm(p).trim().replace(/ /g, '\\s+')).join('|') + ')(?=\\s|$)', 'g');
const seasonRe = new RegExp('(?:^|\\s)(' + [...SEASONING_PHRASES].sort((a, b) => b.length - a.length).map(p => norm(p).trim().replace(/ /g, '\\s+')).join('|') + ')(?=s?\\s|$)', 'g');
const vagueRe = new RegExp('(?:^|\\s)(' + [...VAGUE_PHRASES].sort((a, b) => b.length - a.length).map(p => norm(p).trim().replace(/ /g, '\\s+')).join('|') + ')(?=\\s|$)', 'g');

/** Replace safe phrases with a neutral token so e.g. "coconut milk" does not count as dairy. */
export function stripSafe(normalized: string): string {
  return normalized.replace(OIL_RUN, ' _safe_ ').replace(safeRe, ' _safe_ ');
}
export function stripSeasonings(normalized: string): string {
  return normalized.replace(seasonRe, ' _season_ ');
}

export function findTerms(normalized: string, cat: FoodCat): string[] {
  const re = lexRegex(cat);
  re.lastIndex = 0;
  const out: string[] = [];
  for (const m of normalized.matchAll(re)) out.push(m[1].replace(/\s+/g, ' '));
  if (!out.length) out.push(...findInRunOns(normalized, cat));
  return out;
}

// UNC's ingredient text sometimes runs words together ("smokedcucumbercheese", "shredded carrotginger").
// Inside such run-on tokens (14+ letters) we also look for single-word terms of 5+ letters.
// This only ever finds MORE foods, which is the safe direction for every rule.
const runOnCache = new Map<FoodCat, string[]>();
function findInRunOns(normalized: string, cat: FoodCat): string[] {
  const tokens = normalized.split(' ').filter(t => t.length >= 14 && /^[a-z]+$/.test(t));
  if (!tokens.length) return [];
  let terms = runOnCache.get(cat);
  if (!terms) { terms = [...new Set(T[cat])].filter(t => !t.includes(' ') && t.length >= 5).sort((a, b) => b.length - a.length); runOnCache.set(cat, terms); }
  const safe = SAFE_RUNON;
  for (const tok of tokens) {
    let t = tok;
    for (const sp of safe) t = t.split(sp).join('_');
    for (const term of terms) if (t.includes(term)) return [term];
  }
  return [];
}
const SAFE_RUNON = ['eggplant', 'buttermilk', 'butternut', 'peppercorn', 'nutmeg', 'buckwheat', 'coconut', 'cornstarch', 'peanutbutter', 'cocoabutter', 'creamoftartar', 'sweetcorn', 'cornsyrup', 'riceflour', 'ricevinegar', 'winevinegar', 'grapeseed', 'starchmodified', 'pepperflakes', 'blackpepper', 'whitepepper'];

export function hasVague(normalized: string): string[] {
  vagueRe.lastIndex = 0;
  return [...normalized.matchAll(vagueRe)].map(m => m[1].replace(/\s+/g, ' '));
}

export const ANIMAL_CATS: FoodCat[] = ['meat', 'poultry', 'fish', 'shellfish', 'dairy', 'egg', 'honey'];
export const PLANT_CATS: FoodCat[] = ['grains', 'legumes', 'vegetables', 'fruit', 'nuts_seeds'];
export const CAT_LABELS: Record<FoodCat, string> = {
  meat: 'meat', poultry: 'poultry', fish: 'fish', shellfish: 'shellfish', dairy: 'dairy', egg: 'egg', honey: 'honey', grains: 'grains',
  legumes: 'legumes', vegetables: 'vegetables', fruit: 'fruit', nuts_seeds: 'nuts or seeds', gluten: 'gluten', wheat: 'wheat', soy: 'soy', sesame: 'sesame',
  peanut: 'peanut', tree_nut: 'tree nuts', pork: 'pork', alcohol: 'alcohol',
};
