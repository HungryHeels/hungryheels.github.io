// Which food picture goes next to a dish. Decorative only: the picture never stands in for words, never decides
// anything, and is chosen from the dish's own name, so it fits the dish instead of being picked by course or at random.
// English dish names put the kind of dish last ("Blueberry Swirl Cheesecake", "Mango Thai Shrimp"), so the rightmost
// recognised word wins. Anything not recognised gets the neutral plate (a dish), never a guess.
import type { Sprite } from './art.ts';

type Rule = [Sprite, RegExp];
const w = (words: string) => new RegExp(`\\b(?:${words})\\b`, 'g');

/** Words that name what kind of dish it is. Checked first, on the whole name (before any "with …"). */
const DISH: Rule[] = [
  ['drink', w('dr pepper|diet dr pepper|gatorade[a-z ]*|sunkist[a-z ]*|powerade[a-z ]*|sweet tea|unsweet tea|iced tea|root beer')],
  ['cereal', w('cinnamon toast crunch|apple jacks|cocoa puffs|lucky charms|froot loops|frosted flakes|frosted mini wheats|golden grahams|honey nut cheerios|cheerios|rice krispies|raisin bran|corn flakes|special k|kix|chex|corn pops')],
  ['yogurt', w('yogurt(?: [a-z]+)?|greek yogurt|parfaits?|pudding|mousse(?: cups)?|yogurt cups?')],
  ['candy', w('krispie treats|marshmallow treats|treats|m&ms?|brown sugar|cinnamon sugar(?: mix)?|toasted coconut|squares|bears in a cup|gummy bears')],
  ['sandwich', w('(?:chicken|sausage|ham|bacon|egg) biscuit|chicken ciabatta|(?:ham|sausage|bacon),? egg,? and cheese muffins?')],
  ['pasta', w('mac (?:&|and) cheese|macaroni (?:&|and) cheese|bow ties|farfalle|cellentani')],
  ['cake', w('bread pudding|mocha cups')],
  ['cookie', w('macaroons?|cream pies')],
  ['donut', w('churros?')],
  ['sauce', w('preserves|vinegar|wasabi|pickled ginger|whipped topping|whipped cream')],
  ['fries', w('tortilla straws|tortilla strips')],
  ['soup', w('soups?|chowder|bisque|chili|stew|gumbo|ramen|pho|broth|jambalaya')],
  ['salad', w('tabbouleh|tabouli|salads?|slaw|coleslaw|caesar|greens mix|salad mix|slaw mix|lettuce|romaine|spring mix|arugula')],
  ['sandwich', w('sandwich(?:es)?|subs?|hoagie|club|melt|cheesesteak|panini|po boy|muffaletta|blt|grilled cheese')],
  ['burger', w('(?:cheese)?burgers?|sliders?|patty|patties')],
  ['pizza', w('pizzas?|flatbread|calzone|stromboli')],
  ['wrap', w('burritos?|wraps?|gyros?|shawarma|tortillas?|lavash')],
  ['taco', w('tacos?|quesadillas?|nachos|enchiladas?|fajitas?|tostadas?|tamales?|empanadas?')],
  ['sushi', w('sushi|maki|nigiri|poke|california roll|avocado roll|spicy tuna roll|cucumber roll|veggie roll|crab roll')],
  ['bowl', w('bowls?|bibimbap|buddha')],
  ['pasta', w('pasta|penne|ziti|spaghetti|linguine|fettuccine|rigatoni|rotini|cavatappi|macaroni|mac|lasagna|ravioli|tortellini|manicotti|shells|gnocchi|noodles?|lo mein|orzo|alfredo|carbonara|primavera|bolognese|marinara pasta')],
  ['pancake', w('pancakes?|french toast|crepes?|flapjacks?')],
  ['waffle', w('waffles?')],
  ['egg', w('omelets?|omelettes?|scramble|scrambled eggs?|eggs?|frittata|quiche|egg whites?|shakshuka|hard boiled')],
  ['cereal', w('cereal|oatmeal|oats|granola|porridge|cream of wheat')],
  ['cake', w('cakes?|cheesecake|cupcakes?|brownies?|blondies?|pies?|cobbler|crisp|tarts?|bars?|tiramisu|trifle|crinkles?|fudge')],
  ['cookie', w('cookies?|snickerdoodles?|biscotti|macarons?|crackers?|graham')],
  ['muffin', w('muffins?|scones?|quickbread|danish|turnovers?|croissants?|cinnamon rolls?|sticky buns?|coffee cake|loaf|banana bread|zucchini bread|pastry|pastries|strudel|beignets?')],
  ['donut', w('donuts?|doughnuts?|donut bites|crullers?')],
  ['icecream', w('ice cream|gelato|sorbet|sherbet|frozen yogurt|froyo|sundae|soft serve|popsicle')],
  ['coffee', w('coffee|latte|cappuccino|cappucino|espresso|mocha|americano|tea|chai|hot chocolate|cocoa')],
  ['drink', w('juice|smoothies?|shakes?|milk|oatmilk|soymilk|almondmilk|lemonade|soda|cider|water|gatorade|powerade|cheerwine|coke|sprite|pepsi|ginger ale|punch|kombucha|beverages?|drinks?')],
  ['sauce', w('sauces?|dressing|gravy|syrup|ketchup|mustard|mayonnaise|mayo|aioli|salsa|pico de gallo|guacamole|hummus|tzatziki|dip|ranch|vinaigrette|pesto|relish|chutney|spread|jam|jelly|butter|margarine|honey|glaze|marinara|alfredo sauce|queso|sour cream|cream cheese|tahini|sriracha|hot sauce|soy sauce|teriyaki sauce|bbq sauce|chimichurri|caponata|condiments?')],
  ['candy', w('candy|candies|sprinkles|chocolate chips|marshmallows?|gummy|gummies|oreos?|toffee|caramel|granola bars?|protein bars?|snack bars?|cereal bars?')],
  ['fruit', w('fruit bars?|fruit cups?|fruit salad')],
  ['wrap', w('egg rolls?|spring rolls?')],
];
/** Main-ingredient words, used only when no dish word matched. Checked on the first part of an "X and Y" name. */
const INGREDIENT: Rule[] = [
  ['cereal', w('grits')],
  ['meat', w('(?:sausage|turkey sausage) patt(?:y|ies)|(?:corn|hot|cheese|chili cheese) dogs?|brats?|ropa vieja')],
  ['tofu', w('soy bites')],
  ['egg', w('strata')],
  ['potato', w('papas')],
  ['veg', w('pickles?|dill pickles')],
  ['banana', w('bananas?|plantains?|tostones|maduros')],
  ['veg', w('eggplant parm(?:esan|igiana)?|green beans?|string beans?')],
  ['shrimp', w('shrimp|prawns?|scallops?|crab|lobster|clams?|mussels?|calamari|crawfish')],
  ['fish', w('fish|salmon|cod|tilapia|catfish|tuna|pollock|haddock|trout|mahi|swai|halibut|flounder|whiting|sardines?|anchov(?:y|ies)')],
  ['chicken', w('chicken parm(?:esan|igiana)?|chicken|turkey|poultry|pollo|wings?|drumsticks?|thighs?|tenders?|nuggets?|duck')],
  ['meat', w('beef|steak|sirloin|brisket|pork|ham|bacon|sausages?|chorizo|kielbasa|pepperoni|salami|ribs?|lamb|veal|meatballs?|meatloaf|pastrami|prosciutto|carne asada|carnitas|barbacoa|roast beef|pot roast|loin|chops?|hot dogs?|bratwurst|bulgogi|meat|jerky|ground beef')],
  ['tofu', w('tofu|tempeh|seitan|soy nuggets|soy chorizo')],
  ['egg', w('eggs?')],
  ['fries', w('fries|tots|tater tots|chips|hash browns|hashbrowns|potato wedges|onion rings|plantain chips|yuca fries')],
  ['potato', w('potato(?:es)?|mashed|hash|yams?|sweet potato(?:es)?|yuca|cassava')],
  ['rice', w('rice|arroz|pilaf|risotto|quinoa|farro|couscous|bulgur|barley|paella|biryani|congee|grains?')],
  ['beans', w('beans?|lentils?|chickpeas?|garbanzos?|black-eyed peas|black eyed peas|edamame|dal|dahl|falafel|refried')],
  ['bread', w('bread|breads|toast|bagels?|rolls?|buns?|biscuits?|cornbread|pita|naan|focaccia|ciabatta|baguette|sourdough|english muffins?|croutons|stuffing|dressing cornbread|pretzels?|hush ?puppies')],
  ['cheese', w('cheese|cheddar|mozzarella|parmesan|provolone|swiss|feta|brie|gouda|pepper jack|american cheese|ricotta|cottage cheese|paneer|halloumi')],
  ['fruit', w('fruits?|apples?|applesauce|oranges?|grapes?|melons?|cantaloupe|honeydew|watermelon|pineapples?|mango(?:es)?|peach(?:es)?|pears?|berries|strawberr(?:y|ies)|blueberr(?:y|ies)|raspberr(?:y|ies)|blackberr(?:y|ies)|cherr(?:y|ies)|kiwi|plums?|grapefruit|clementines?|cranberr(?:y|ies)|raisins|dates|figs|apricots?|papaya|fruit cup|fruit salad')],
  ['veg', w('vegetables?|veggies?|broccoli|carrots?|green beans|string beans|zucchini|squash|cauliflower|cabbage|collards?|collard greens|greens|kale|spinach|chard|peppers?|onions?|mushrooms?|corn|peas|brussels?|sprouts|bok choy|asparagus|eggplant|okra|tomato(?:es)?|cucumbers?|celery|beets?|radish(?:es)?|turnips?|parsnips?|artichokes?|olives?|jalapenos?|scallions?|leeks?|avocado|medley|succotash|ratatouille|edamame salad')],
];

/** Cooking-style words that don't say what the food is; set aside so the main food decides ("Beef & Broccoli Stir-Fry"). */
const NEUTRAL = /\b(?:stir[- ]?fr(?:y|ied)|pot pies?|curry|casserole|bake|wok|sautee|ragout|skillet|creole|cacciatore|scampi|marsala|florentine|masala|tinga|vindaloo|chevre|aurora|gremolada)\b/g;
/** When nothing else names the dish, these cooking styles are usually served in a bowl. */
const BOWL_STYLE = /\b(?:curry|stir[- ]?fry|skillet|stirfry)\b/;

const clean = (name: string) => name.toLowerCase()
  .replace(/\([^)]*\)/g, ' ')                 // "(Made Without Gluten)"
  .replace(/[®™*]/g, '')
  .replace(/\s+(?:with|w\/|served with|over|on a|topped with)\s.*$/, '')   // "Pork Ribs with BBQ Sauce" → "pork ribs"
  .replace(/[^a-z0-9&'\- ]+/g, ' ')
  .replace(/\s+/g, ' ').trim();

/** Sauce and candy words name the dish only when nothing more specific follows ("Honey Mustard Ham"). */
const WEAK = new Set<Sprite>(['sauce', 'candy']);
const DISH_SET = new Set(DISH);
const ALL: Rule[] = [...DISH, ...INGREDIENT];
interface Hit { sprite: Sprite; start: number; end: number; dish: boolean }

/** The rightmost match in a text; at the same end, the longer (more specific) match wins, then the earlier rule. */
function rightmost(text: string, rules: Rule[]): Hit | null {
  let best: Hit | null = null;
  for (const rule of rules) {
    const [sprite, re] = rule;
    re.lastIndex = 0;
    for (let m; (m = re.exec(text));) {
      const end = m.index + m[0].length;
      if (!best || end > best.end || (end === best.end && m.index < best.start)) best = { sprite, start: m.index, end, dish: DISH_SET.has(rule) };
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return best;
}

/** The picture for a dish name; null when nothing in the name is recognised. */
export function dishSprite(name: string): Sprite | null {
  const full = clean(name);
  const t = full.replace(NEUTRAL, ' ').replace(/\s+/g, ' ').trim();
  const hit = t ? rightmost(t, ALL) : null;
  if (!hit) return BOWL_STYLE.test(full) ? 'bowl' : null;           // "Thai Red Curry"
  if (hit.dish && !WEAK.has(hit.sprite)) return hit.sprite;         // "Chicken Noodle Soup"; "Hamburger Bun" → bread
  // "X and Y" where Y is one plain food: X is the dish ("Shrimp and Grits", "Red Beans & Rice", "Beef & Broccoli").
  // Not when the "and" joins modifiers of the last food ("Bacon & Onion Green Beans", "Bacon and Scallion Mashed Potatoes").
  const parts = t.split(/\s(?:and|&|con|y)\s|,\s*(?:and\s)?/);
  if (parts.length > 1 && foodsIn(parts[parts.length - 1]) === 1) {
    const first = rightmost(parts[0], ALL);
    if (first) return first.sprite;
  }
  return hit.sprite;
}
/** How many separate foods a phrase names (overlapping matches count once). */
function foodsIn(text: string): number {
  const spans: Array<[number, number]> = [];
  for (const [, re] of ALL) { re.lastIndex = 0; for (let m; (m = re.exec(text));) { spans.push([m.index, m.index + m[0].length]); if (!m[0].length) re.lastIndex++; } }
  spans.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  let n = 0, reach = -1;
  for (const [a, b] of spans) if (a >= reach) { n++; reach = b; } else reach = Math.max(reach, b);
  return n;
}

/** Station headings get a picture only when the station name itself names a food. */
export function stationSprite(station: string): Sprite | null {
  const t = clean(station).replace(/\s*\bbar\b/g, '');            // "Hummus Bar" is hummus, not a dessert bar
  if (/\bdeli\b/.test(t)) return 'sandwich';
  if (/\bbakery\b/.test(t)) return 'muffin';
  return t ? dishSprite(t) : null;
}

/** The picture for a dish: its name, then its station; the neutral plate when neither says what it is. */
export function spriteForDish(name: string, station = ''): Sprite {
  const st = station ? stationSprite(station) : null;
  if (st === 'sushi' && /\brolls?\b/i.test(name)) return 'sushi';   // "Dragon Roll" at a sushi station is sushi, not bread
  return dishSprite(name) ?? st ?? 'plate';
}
