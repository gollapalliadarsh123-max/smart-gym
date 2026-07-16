/** Offline nutrition catalog ported from legacy app (approx values). */

export interface NutritionMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionEntry {
  per100g?: NutritionMacros;
  perUnit?: NutritionMacros & { grams?: number };
  junk?: boolean;
  neutral?: boolean;
  label?: string;
}

export const NUTRITION_DB: Record<string, NutritionEntry> = {
  "egg": {
    "perUnit": {
      "grams": 50,
      "calories": 72,
      "protein": 6.3,
      "carbs": 0.4,
      "fat": 5
    }
  },
  "banana": {
    "perUnit": {
      "grams": 118,
      "calories": 105,
      "protein": 1.3,
      "carbs": 27,
      "fat": 0.3
    }
  },
  "chicken": {
    "label": "Chicken Breast",
    "per100g": {
      "calories": 165,
      "protein": 31,
      "carbs": 0,
      "fat": 3.6
    }
  },
  "rice": {
    "per100g": {
      "calories": 130,
      "protein": 2.4,
      "carbs": 28,
      "fat": 0.3
    }
  },
  "oats": {
    "per100g": {
      "calories": 389,
      "protein": 16.9,
      "carbs": 66.3,
      "fat": 6.9
    }
  },
  "paneer": {
    "per100g": {
      "calories": 265,
      "protein": 18.3,
      "carbs": 1.2,
      "fat": 20.8
    }
  },
  "milk": {
    "per100g": {
      "calories": 61,
      "protein": 3.2,
      "carbs": 4.8,
      "fat": 3.3
    },
    "neutral": true
  },
  "roti": {
    "perUnit": {
      "grams": 40,
      "calories": 120,
      "protein": 3,
      "carbs": 20,
      "fat": 3
    },
    "neutral": true
  },
  "apple": {
    "perUnit": {
      "grams": 182,
      "calories": 95,
      "protein": 0.5,
      "carbs": 25,
      "fat": 0.3
    }
  },
  "potato": {
    "per100g": {
      "calories": 77,
      "protein": 2,
      "carbs": 17,
      "fat": 0.1
    },
    "neutral": true
  },
  "bread": {
    "per100g": {
      "calories": 265,
      "protein": 9,
      "carbs": 49,
      "fat": 3.2
    },
    "neutral": true
  },
  "fish": {
    "per100g": {
      "calories": 206,
      "protein": 22,
      "carbs": 0,
      "fat": 12
    }
  },
  "yogurt": {
    "per100g": {
      "calories": 59,
      "protein": 10,
      "carbs": 3.6,
      "fat": 0.4
    }
  },
  "almonds": {
    "per100g": {
      "calories": 579,
      "protein": 21,
      "carbs": 22,
      "fat": 50
    }
  },
  "salad": {
    "per100g": {
      "calories": 35,
      "protein": 2,
      "carbs": 7,
      "fat": 0.2
    }
  },
  "broccoli": {
    "per100g": {
      "calories": 34,
      "protein": 2.8,
      "carbs": 6.6,
      "fat": 0.4
    }
  },
  "chicken_curry": {
    "per100g": {
      "calories": 140,
      "protein": 18,
      "carbs": 5,
      "fat": 5.5
    }
  },
  "mutton_curry": {
    "per100g": {
      "calories": 245,
      "protein": 17,
      "carbs": 5,
      "fat": 17
    }
  },
  "fish_curry": {
    "per100g": {
      "calories": 170,
      "protein": 18,
      "carbs": 5,
      "fat": 8
    }
  },
  "paneer_butter_masala": {
    "per100g": {
      "calories": 305,
      "protein": 9,
      "carbs": 9,
      "fat": 25
    }
  },
  "chana_masala": {
    "per100g": {
      "calories": 165,
      "protein": 8,
      "carbs": 20,
      "fat": 6
    }
  },
  "rajma_curry": {
    "per100g": {
      "calories": 140,
      "protein": 7,
      "carbs": 18,
      "fat": 4
    }
  },
  "dal_tadka": {
    "per100g": {
      "calories": 110,
      "protein": 6,
      "carbs": 14,
      "fat": 3.5
    }
  },
  "sambar": {
    "per100g": {
      "calories": 55,
      "protein": 2,
      "carbs": 8,
      "fat": 1.5
    }
  },
  "coconut_chutney": {
    "per100g": {
      "calories": 205,
      "protein": 3,
      "carbs": 8,
      "fat": 18
    }
  },
  "mint_chutney": {
    "per100g": {
      "calories": 95,
      "protein": 3,
      "carbs": 10,
      "fat": 5
    }
  },
  "tomato_chutney": {
    "per100g": {
      "calories": 85,
      "protein": 2,
      "carbs": 12,
      "fat": 3
    }
  },
  "peanut_chutney": {
    "per100g": {
      "calories": 315,
      "protein": 11,
      "carbs": 12,
      "fat": 25
    }
  },
  "burger": {
    "per100g": {
      "calories": 295,
      "protein": 13,
      "carbs": 30,
      "fat": 12
    },
    "junk": true
  },
  "pizza": {
    "per100g": {
      "calories": 266,
      "protein": 11,
      "carbs": 33,
      "fat": 10
    },
    "junk": true
  },
  "fries": {
    "per100g": {
      "calories": 312,
      "protein": 3.4,
      "carbs": 41,
      "fat": 15
    },
    "junk": true
  },
  "shawarma": {
    "per100g": {
      "calories": 250,
      "protein": 13,
      "carbs": 18,
      "fat": 14
    },
    "junk": true
  },
  "noodles": {
    "per100g": {
      "calories": 190,
      "protein": 5,
      "carbs": 28,
      "fat": 6
    },
    "junk": true
  },
  "momos": {
    "per100g": {
      "calories": 230,
      "protein": 10,
      "carbs": 26,
      "fat": 9
    },
    "junk": true
  },
  "white_bread": {
    "per100g": {
      "calories": 265,
      "protein": 9,
      "carbs": 49,
      "fat": 3.2
    },
    "junk": true
  },
  "brown_bread": {
    "per100g": {
      "calories": 247,
      "protein": 11,
      "carbs": 41,
      "fat": 4.2
    },
    "neutral": true
  },
  "bun": {
    "per100g": {
      "calories": 295,
      "protein": 8,
      "carbs": 55,
      "fat": 4
    },
    "junk": true
  },
  "croissant": {
    "per100g": {
      "calories": 406,
      "protein": 8.2,
      "carbs": 45.8,
      "fat": 21
    },
    "junk": true
  },
  "muffin": {
    "per100g": {
      "calories": 377,
      "protein": 5,
      "carbs": 53,
      "fat": 16
    },
    "junk": true
  },
  "cake": {
    "per100g": {
      "calories": 360,
      "protein": 4,
      "carbs": 50,
      "fat": 15
    },
    "junk": true
  },
  "cookies": {
    "per100g": {
      "calories": 488,
      "protein": 5,
      "carbs": 67,
      "fat": 22
    },
    "junk": true
  },
  "boiled_egg_white": {
    "perUnit": {
      "grams": 33,
      "calories": 17,
      "protein": 3.6,
      "carbs": 0.2,
      "fat": 0.1
    }
  },
  "whey_protein": {
    "perUnit": {
      "grams": 30,
      "calories": 120,
      "protein": 24,
      "carbs": 3,
      "fat": 1.5
    }
  },
  "grilled_chicken": {
    "per100g": {
      "calories": 165,
      "protein": 31,
      "carbs": 0,
      "fat": 3.6
    }
  },
  "greek_yogurt": {
    "per100g": {
      "calories": 59,
      "protein": 10,
      "carbs": 3.6,
      "fat": 0.4
    }
  },
  "boiled_chickpeas": {
    "per100g": {
      "calories": 164,
      "protein": 8.9,
      "carbs": 27.4,
      "fat": 2.6
    }
  },
  "sweet_potato": {
    "per100g": {
      "calories": 86,
      "protein": 1.6,
      "carbs": 20.1,
      "fat": 0.1
    }
  },
  "peanut_butter": {
    "per100g": {
      "calories": 588,
      "protein": 25,
      "carbs": 20,
      "fat": 50
    }
  },
  "tofu": {
    "per100g": {
      "calories": 76,
      "protein": 8,
      "carbs": 1.9,
      "fat": 4.8
    }
  },
  "quinoa": {
    "per100g": {
      "calories": 120,
      "protein": 4.4,
      "carbs": 21.3,
      "fat": 1.9
    }
  },
  "soda": {
    "per100g": {
      "calories": 42,
      "protein": 0,
      "carbs": 10.6,
      "fat": 0
    },
    "junk": true
  },
  "carrot": {
    "per100g": {
      "calories": 41,
      "protein": 0.9,
      "carbs": 10,
      "fat": 0.2
    }
  },
  "tomato": {
    "per100g": {
      "calories": 18,
      "protein": 0.9,
      "carbs": 3.9,
      "fat": 0.2
    }
  },
  "onion": {
    "per100g": {
      "calories": 40,
      "protein": 1.1,
      "carbs": 9.3,
      "fat": 0.1
    }
  },
  "cauliflower": {
    "per100g": {
      "calories": 25,
      "protein": 1.9,
      "carbs": 5.3,
      "fat": 0.3
    }
  },
  "cabbage": {
    "per100g": {
      "calories": 25,
      "protein": 1.3,
      "carbs": 5.8,
      "fat": 0.1
    }
  },
  "capsicum": {
    "per100g": {
      "calories": 31,
      "protein": 1,
      "carbs": 6,
      "fat": 0.3
    }
  },
  "bell_pepper": {
    "per100g": {
      "calories": 31,
      "protein": 1,
      "carbs": 6,
      "fat": 0.3
    }
  },
  "okra": {
    "per100g": {
      "calories": 33,
      "protein": 1.9,
      "carbs": 7.5,
      "fat": 0.2
    }
  },
  "bhindi": {
    "per100g": {
      "calories": 33,
      "protein": 1.9,
      "carbs": 7.5,
      "fat": 0.2
    }
  },
  "brinjal": {
    "per100g": {
      "calories": 25,
      "protein": 1,
      "carbs": 5.9,
      "fat": 0.2
    }
  },
  "eggplant": {
    "per100g": {
      "calories": 25,
      "protein": 1,
      "carbs": 5.9,
      "fat": 0.2
    }
  },
  "baingan": {
    "per100g": {
      "calories": 25,
      "protein": 1,
      "carbs": 5.9,
      "fat": 0.2
    }
  },
  "bitter_gourd": {
    "per100g": {
      "calories": 34,
      "protein": 1.8,
      "carbs": 7.3,
      "fat": 0.2
    }
  },
  "karela": {
    "per100g": {
      "calories": 34,
      "protein": 1.8,
      "carbs": 7.3,
      "fat": 0.2
    }
  },
  "bottle_gourd": {
    "per100g": {
      "calories": 14,
      "protein": 0.6,
      "carbs": 3.4,
      "fat": 0
    }
  },
  "lauki": {
    "per100g": {
      "calories": 14,
      "protein": 0.6,
      "carbs": 3.4,
      "fat": 0
    }
  },
  "ridge_gourd": {
    "per100g": {
      "calories": 20,
      "protein": 0.6,
      "carbs": 4.4,
      "fat": 0.1
    }
  },
  "turai": {
    "per100g": {
      "calories": 20,
      "protein": 0.6,
      "carbs": 4.4,
      "fat": 0.1
    }
  },
  "snake_gourd": {
    "per100g": {
      "calories": 18,
      "protein": 0.5,
      "carbs": 3.3,
      "fat": 0.1
    }
  },
  "drumstick": {
    "per100g": {
      "calories": 92,
      "protein": 6.7,
      "carbs": 8.3,
      "fat": 2
    }
  },
  "spinach": {
    "per100g": {
      "calories": 23,
      "protein": 2.9,
      "carbs": 3.6,
      "fat": 0.4
    }
  },
  "palak": {
    "per100g": {
      "calories": 23,
      "protein": 2.9,
      "carbs": 3.6,
      "fat": 0.4
    }
  },
  "fenugreek_leaves": {
    "per100g": {
      "calories": 49,
      "protein": 4.4,
      "carbs": 6,
      "fat": 0.9
    }
  },
  "methi": {
    "per100g": {
      "calories": 49,
      "protein": 4.4,
      "carbs": 6,
      "fat": 0.9
    }
  },
  "mustard_greens": {
    "per100g": {
      "calories": 26,
      "protein": 2.9,
      "carbs": 4.7,
      "fat": 0.5
    }
  },
  "radish": {
    "per100g": {
      "calories": 16,
      "protein": 0.7,
      "carbs": 3.4,
      "fat": 0.1
    }
  },
  "beetroot": {
    "per100g": {
      "calories": 43,
      "protein": 1.6,
      "carbs": 10,
      "fat": 0.2
    }
  },
  "yam": {
    "per100g": {
      "calories": 118,
      "protein": 1.5,
      "carbs": 28,
      "fat": 0.2
    }
  },
  "taro": {
    "per100g": {
      "calories": 112,
      "protein": 1.5,
      "carbs": 26.5,
      "fat": 0.2
    }
  },
  "arbi": {
    "per100g": {
      "calories": 112,
      "protein": 1.5,
      "carbs": 26.5,
      "fat": 0.2
    }
  },
  "green_peas": {
    "per100g": {
      "calories": 81,
      "protein": 5.4,
      "carbs": 14,
      "fat": 0.4
    }
  },
  "peas": {
    "per100g": {
      "calories": 81,
      "protein": 5.4,
      "carbs": 14,
      "fat": 0.4
    }
  },
  "sweet_corn": {
    "per100g": {
      "calories": 86,
      "protein": 3.3,
      "carbs": 19,
      "fat": 1.4
    }
  },
  "mushroom": {
    "per100g": {
      "calories": 22,
      "protein": 3.1,
      "carbs": 3.3,
      "fat": 0.3
    }
  },
  "cucumber": {
    "per100g": {
      "calories": 15,
      "protein": 0.7,
      "carbs": 3.6,
      "fat": 0.1
    }
  },
  "lettuce": {
    "per100g": {
      "calories": 15,
      "protein": 1.4,
      "carbs": 2.9,
      "fat": 0.2
    }
  },
  "zucchini": {
    "per100g": {
      "calories": 17,
      "protein": 1.2,
      "carbs": 3.1,
      "fat": 0.3
    }
  },
  "pumpkin": {
    "per100g": {
      "calories": 26,
      "protein": 1,
      "carbs": 6.5,
      "fat": 0.1
    }
  },
  "ivy_gourd": {
    "per100g": {
      "calories": 25,
      "protein": 2.2,
      "carbs": 3.1,
      "fat": 0.4
    }
  },
  "tindora": {
    "per100g": {
      "calories": 25,
      "protein": 2.2,
      "carbs": 3.1,
      "fat": 0.4
    }
  },
  "cluster_beans": {
    "per100g": {
      "calories": 44,
      "protein": 3,
      "carbs": 8,
      "fat": 0.4
    }
  },
  "gwar": {
    "per100g": {
      "calories": 44,
      "protein": 3,
      "carbs": 8,
      "fat": 0.4
    }
  },
  "mango": {
    "per100g": {
      "calories": 60,
      "protein": 0.8,
      "carbs": 15,
      "fat": 0.4
    }
  },
  "raw_mango": {
    "per100g": {
      "calories": 43,
      "protein": 0.5,
      "carbs": 10.5,
      "fat": 0.2
    }
  },
  "papaya": {
    "per100g": {
      "calories": 43,
      "protein": 0.5,
      "carbs": 11,
      "fat": 0.3
    }
  },
  "guava": {
    "per100g": {
      "calories": 68,
      "protein": 2.6,
      "carbs": 14,
      "fat": 0.9
    }
  },
  "watermelon": {
    "per100g": {
      "calories": 30,
      "protein": 0.6,
      "carbs": 8,
      "fat": 0.2
    }
  },
  "muskmelon": {
    "per100g": {
      "calories": 34,
      "protein": 0.8,
      "carbs": 8.2,
      "fat": 0.2
    }
  },
  "pomegranate": {
    "per100g": {
      "calories": 83,
      "protein": 1.7,
      "carbs": 19,
      "fat": 1.2
    }
  },
  "orange": {
    "per100g": {
      "calories": 47,
      "protein": 0.9,
      "carbs": 12,
      "fat": 0.1
    }
  },
  "mosambi": {
    "per100g": {
      "calories": 43,
      "protein": 0.8,
      "carbs": 10.5,
      "fat": 0.2
    }
  },
  "sweet_lime": {
    "per100g": {
      "calories": 43,
      "protein": 0.8,
      "carbs": 10.5,
      "fat": 0.2
    }
  },
  "grapes": {
    "per100g": {
      "calories": 69,
      "protein": 0.7,
      "carbs": 18,
      "fat": 0.2
    }
  },
  "pear": {
    "per100g": {
      "calories": 57,
      "protein": 0.4,
      "carbs": 15,
      "fat": 0.1
    }
  },
  "peach": {
    "per100g": {
      "calories": 39,
      "protein": 0.9,
      "carbs": 10,
      "fat": 0.3
    }
  },
  "plum": {
    "per100g": {
      "calories": 46,
      "protein": 0.7,
      "carbs": 11.4,
      "fat": 0.3
    }
  },
  "pineapple": {
    "per100g": {
      "calories": 50,
      "protein": 0.5,
      "carbs": 13,
      "fat": 0.1
    }
  },
  "custard_apple": {
    "per100g": {
      "calories": 101,
      "protein": 1.7,
      "carbs": 23,
      "fat": 0.6
    }
  },
  "sitaphal": {
    "per100g": {
      "calories": 101,
      "protein": 1.7,
      "carbs": 23,
      "fat": 0.6
    }
  },
  "sugar_apple": {
    "per100g": {
      "calories": 101,
      "protein": 1.7,
      "carbs": 23,
      "fat": 0.6
    }
  },
  "chikoo": {
    "per100g": {
      "calories": 83,
      "protein": 0.4,
      "carbs": 20,
      "fat": 1.1
    }
  },
  "sapota": {
    "per100g": {
      "calories": 83,
      "protein": 0.4,
      "carbs": 20,
      "fat": 1.1
    }
  },
  "lychee": {
    "per100g": {
      "calories": 66,
      "protein": 0.8,
      "carbs": 16.5,
      "fat": 0.4
    }
  },
  "coconut_water": {
    "per100g": {
      "calories": 19,
      "protein": 0.7,
      "carbs": 3.7,
      "fat": 0.2
    }
  },
  "coconut_meat": {
    "per100g": {
      "calories": 354,
      "protein": 3.3,
      "carbs": 15,
      "fat": 33
    }
  },
  "dates": {
    "per100g": {
      "calories": 277,
      "protein": 1.8,
      "carbs": 75,
      "fat": 0.2
    }
  },
  "fig": {
    "per100g": {
      "calories": 74,
      "protein": 0.8,
      "carbs": 19,
      "fat": 0.3
    }
  },
  "jamun": {
    "per100g": {
      "calories": 60,
      "protein": 0.7,
      "carbs": 14,
      "fat": 0.2
    }
  },
  "jackfruit": {
    "per100g": {
      "calories": 95,
      "protein": 1.7,
      "carbs": 23,
      "fat": 0.6
    }
  },
  "amla": {
    "per100g": {
      "calories": 44,
      "protein": 0.9,
      "carbs": 10,
      "fat": 0.6
    }
  },
  "kiwi": {
    "per100g": {
      "calories": 61,
      "protein": 1.1,
      "carbs": 15,
      "fat": 0.5
    }
  },
  "strawberry": {
    "per100g": {
      "calories": 32,
      "protein": 0.7,
      "carbs": 7.7,
      "fat": 0.3
    }
  },
  "blueberries": {
    "per100g": {
      "calories": 57,
      "protein": 0.7,
      "carbs": 14,
      "fat": 0.3
    }
  },
  "toor_dal": {
    "per100g": {
      "calories": 343,
      "protein": 22,
      "carbs": 63,
      "fat": 1.7
    }
  },
  "arhar": {
    "per100g": {
      "calories": 343,
      "protein": 22,
      "carbs": 63,
      "fat": 1.7
    }
  },
  "masoor_dal": {
    "per100g": {
      "calories": 352,
      "protein": 24,
      "carbs": 60,
      "fat": 1.1
    }
  },
  "moong_dal": {
    "per100g": {
      "calories": 347,
      "protein": 24,
      "carbs": 63,
      "fat": 1.2
    }
  },
  "urad_dal": {
    "per100g": {
      "calories": 341,
      "protein": 24,
      "carbs": 59,
      "fat": 1.4
    }
  },
  "chana_dal": {
    "per100g": {
      "calories": 360,
      "protein": 21,
      "carbs": 63,
      "fat": 5.3
    }
  },
  "rajma": {
    "per100g": {
      "calories": 333,
      "protein": 24,
      "carbs": 60,
      "fat": 0.8
    }
  },
  "lobia": {
    "per100g": {
      "calories": 336,
      "protein": 23.5,
      "carbs": 60.3,
      "fat": 1.3
    }
  },
  "chickpea": {
    "per100g": {
      "calories": 364,
      "protein": 19,
      "carbs": 61,
      "fat": 6
    }
  },
  "kabuli_chana": {
    "per100g": {
      "calories": 364,
      "protein": 19,
      "carbs": 61,
      "fat": 6
    }
  },
  "wheat_flour": {
    "per100g": {
      "calories": 364,
      "protein": 10.3,
      "carbs": 76,
      "fat": 2
    }
  },
  "atta": {
    "per100g": {
      "calories": 364,
      "protein": 10.3,
      "carbs": 76,
      "fat": 2
    }
  },
  "besan": {
    "per100g": {
      "calories": 387,
      "protein": 22,
      "carbs": 58,
      "fat": 6.7
    }
  },
  "gram_flour": {
    "per100g": {
      "calories": 387,
      "protein": 22,
      "carbs": 58,
      "fat": 6.7
    }
  },
  "suji": {
    "per100g": {
      "calories": 360,
      "protein": 12,
      "carbs": 73,
      "fat": 1.1
    }
  },
  "semolina": {
    "per100g": {
      "calories": 360,
      "protein": 12,
      "carbs": 73,
      "fat": 1.1
    }
  },
  "vermicelli": {
    "per100g": {
      "calories": 344,
      "protein": 10,
      "carbs": 75,
      "fat": 0.9
    }
  },
  "ragi": {
    "per100g": {
      "calories": 328,
      "protein": 7.3,
      "carbs": 72,
      "fat": 1.3
    }
  },
  "nachni": {
    "per100g": {
      "calories": 328,
      "protein": 7.3,
      "carbs": 72,
      "fat": 1.3
    }
  },
  "jowar": {
    "per100g": {
      "calories": 329,
      "protein": 10.4,
      "carbs": 72,
      "fat": 3.9
    }
  },
  "bajra": {
    "per100g": {
      "calories": 378,
      "protein": 11,
      "carbs": 67,
      "fat": 5
    }
  },
  "brown_rice_raw": {
    "per100g": {
      "calories": 370,
      "protein": 7.5,
      "carbs": 77,
      "fat": 3.2
    }
  },
  "brown_rice": {
    "per100g": {
      "calories": 370,
      "protein": 7.5,
      "carbs": 77,
      "fat": 3.2
    }
  },
  "white_rice_cooked": {
    "per100g": {
      "calories": 130,
      "protein": 2.7,
      "carbs": 28,
      "fat": 0.3
    }
  },
  "basmati_cooked": {
    "per100g": {
      "calories": 121,
      "protein": 2.7,
      "carbs": 25,
      "fat": 0.4
    }
  },
  "brown_rice_cooked": {
    "per100g": {
      "calories": 112,
      "protein": 2.6,
      "carbs": 24,
      "fat": 0.9
    }
  },
  "curd": {
    "per100g": {
      "calories": 59,
      "protein": 10,
      "carbs": 3.6,
      "fat": 0.4
    }
  },
  "buttermilk": {
    "per100g": {
      "calories": 40,
      "protein": 3.3,
      "carbs": 4.8,
      "fat": 1
    }
  },
  "chaas": {
    "per100g": {
      "calories": 40,
      "protein": 3.3,
      "carbs": 4.8,
      "fat": 1
    }
  },
  "ghee": {
    "per100g": {
      "calories": 900,
      "protein": 0,
      "carbs": 0,
      "fat": 100
    }
  },
  "butter": {
    "per100g": {
      "calories": 717,
      "protein": 0.9,
      "carbs": 0.1,
      "fat": 81
    }
  },
  "cheese": {
    "per100g": {
      "calories": 402,
      "protein": 25,
      "carbs": 1.3,
      "fat": 33
    }
  },
  "khoya": {
    "per100g": {
      "calories": 321,
      "protein": 16,
      "carbs": 18,
      "fat": 22
    }
  },
  "soya_chunks_dry": {
    "per100g": {
      "calories": 345,
      "protein": 52,
      "carbs": 33,
      "fat": 0.5
    }
  },
  "mutton": {
    "per100g": {
      "calories": 294,
      "protein": 26,
      "carbs": 0,
      "fat": 21
    }
  },
  "goat_meat": {
    "per100g": {
      "calories": 143,
      "protein": 27,
      "carbs": 0,
      "fat": 3
    }
  },
  "beef": {
    "per100g": {
      "calories": 250,
      "protein": 26,
      "carbs": 0,
      "fat": 17
    }
  },
  "turkey": {
    "per100g": {
      "calories": 189,
      "protein": 29,
      "carbs": 0,
      "fat": 7
    }
  },
  "prawns": {
    "per100g": {
      "calories": 106,
      "protein": 20.3,
      "carbs": 0.9,
      "fat": 1.7
    }
  },
  "tuna": {
    "per100g": {
      "calories": 132,
      "protein": 28,
      "carbs": 0,
      "fat": 1.3
    }
  },
  "peanuts": {
    "per100g": {
      "calories": 567,
      "protein": 25.8,
      "carbs": 16.1,
      "fat": 49.2
    }
  },
  "groundnut": {
    "per100g": {
      "calories": 567,
      "protein": 25.8,
      "carbs": 16.1,
      "fat": 49.2
    }
  },
  "cashew": {
    "per100g": {
      "calories": 553,
      "protein": 18.2,
      "carbs": 30.2,
      "fat": 43.9
    }
  },
  "pistachio": {
    "per100g": {
      "calories": 562,
      "protein": 20.2,
      "carbs": 27.2,
      "fat": 45.3
    }
  },
  "walnut": {
    "per100g": {
      "calories": 654,
      "protein": 15.2,
      "carbs": 13.7,
      "fat": 65.2
    }
  },
  "sunflower_seeds": {
    "per100g": {
      "calories": 584,
      "protein": 21,
      "carbs": 20,
      "fat": 51
    }
  },
  "chia_seeds": {
    "per100g": {
      "calories": 486,
      "protein": 17,
      "carbs": 42,
      "fat": 31
    }
  },
  "flax_seeds": {
    "per100g": {
      "calories": 534,
      "protein": 18,
      "carbs": 29,
      "fat": 42
    }
  },
  "quinoa_cooked": {
    "per100g": {
      "calories": 120,
      "protein": 4.4,
      "carbs": 21.3,
      "fat": 1.9
    }
  },
  "oats_cooked": {
    "per100g": {
      "calories": 71,
      "protein": 2.5,
      "carbs": 12,
      "fat": 1.4
    }
  },
  "honey": {
    "per100g": {
      "calories": 304,
      "protein": 0.3,
      "carbs": 82,
      "fat": 0
    }
  },
  "jaggery": {
    "per100g": {
      "calories": 383,
      "protein": 0.4,
      "carbs": 97,
      "fat": 0
    }
  },
  "sugar": {
    "per100g": {
      "calories": 387,
      "protein": 0,
      "carbs": 100,
      "fat": 0
    }
  },
  "olive_oil": {
    "per100g": {
      "calories": 884,
      "protein": 0,
      "carbs": 0,
      "fat": 100
    }
  },
  "coconut_oil": {
    "per100g": {
      "calories": 862,
      "protein": 0,
      "carbs": 0,
      "fat": 100
    }
  },
  "mustard_oil": {
    "per100g": {
      "calories": 884,
      "protein": 0,
      "carbs": 0,
      "fat": 100
    }
  },
  "idli": {
    "per100g": {
      "calories": 150,
      "protein": 4,
      "carbs": 28,
      "fat": 2.5
    }
  },
  "dosa": {
    "per100g": {
      "calories": 170,
      "protein": 4,
      "carbs": 28,
      "fat": 5
    }
  },
  "uttapam": {
    "per100g": {
      "calories": 160,
      "protein": 5,
      "carbs": 24,
      "fat": 5
    }
  },
  "upma": {
    "per100g": {
      "calories": 120,
      "protein": 3.5,
      "carbs": 18,
      "fat": 4
    }
  },
  "poha": {
    "per100g": {
      "calories": 350,
      "protein": 7,
      "carbs": 72,
      "fat": 1.5
    }
  },
  "poha_cooked": {
    "per100g": {
      "calories": 110,
      "protein": 2.5,
      "carbs": 20,
      "fat": 2.8
    }
  },
  "paratha": {
    "per100g": {
      "calories": 326,
      "protein": 6,
      "carbs": 45,
      "fat": 13
    }
  },
  "naan": {
    "per100g": {
      "calories": 291,
      "protein": 9,
      "carbs": 50,
      "fat": 5.5
    }
  },
  "khichdi": {
    "per100g": {
      "calories": 120,
      "protein": 3.5,
      "carbs": 20,
      "fat": 2.5
    }
  },
  "vegetable_curry": {
    "per100g": {
      "calories": 85,
      "protein": 2.5,
      "carbs": 10,
      "fat": 4
    }
  },
  "biryani": {
    "per100g": {
      "calories": 180,
      "protein": 8,
      "carbs": 28,
      "fat": 4.5
    }
  },
  "chole": {
    "per100g": {
      "calories": 145,
      "protein": 8.5,
      "carbs": 22,
      "fat": 3.2
    }
  },
  "palak_paneer": {
    "per100g": {
      "calories": 180,
      "protein": 11,
      "carbs": 8,
      "fat": 12
    }
  },
  "dal_makhani": {
    "per100g": {
      "calories": 180,
      "protein": 9,
      "carbs": 16,
      "fat": 9
    }
  },
  "samosa": {
    "per100g": {
      "calories": 297,
      "protein": 6,
      "carbs": 34,
      "fat": 16
    },
    "junk": true
  },
  "pakora": {
    "per100g": {
      "calories": 320,
      "protein": 8,
      "carbs": 28,
      "fat": 20
    },
    "junk": true
  },
  "medu_vada": {
    "per100g": {
      "calories": 290,
      "protein": 12,
      "carbs": 28,
      "fat": 15
    },
    "junk": true
  },
  "jalebi": {
    "per100g": {
      "calories": 400,
      "protein": 3,
      "carbs": 70,
      "fat": 14
    },
    "junk": true
  },
  "gulab_jamun": {
    "per100g": {
      "calories": 350,
      "protein": 5,
      "carbs": 45,
      "fat": 16
    },
    "junk": true
  },
  "protein_powder": {
    "perUnit": {
      "grams": 30,
      "calories": 120,
      "protein": 24,
      "carbs": 3,
      "fat": 1.5
    }
  },
  "protein_bar": {
    "per100g": {
      "calories": 400,
      "protein": 20,
      "carbs": 40,
      "fat": 14
    }
  },
  "cornflakes": {
    "per100g": {
      "calories": 357,
      "protein": 8,
      "carbs": 84,
      "fat": 0.4
    }
  },
  "muesli": {
    "per100g": {
      "calories": 352,
      "protein": 9.7,
      "carbs": 74,
      "fat": 5.9
    }
  },
  "avocado": {
    "per100g": {
      "calories": 160,
      "protein": 2,
      "carbs": 9,
      "fat": 15
    }
  },
  "ramen": {
    "per100g": {
      "calories": 450,
      "protein": 10,
      "carbs": 60,
      "fat": 18
    },
    "junk": true
  },
  "coriander": {
    "per100g": {
      "calories": 23,
      "protein": 2.1,
      "carbs": 3.7,
      "fat": 0.5
    }
  },
  "mint": {
    "per100g": {
      "calories": 44,
      "protein": 3.3,
      "carbs": 8.4,
      "fat": 0.7
    }
  },
  "ginger": {
    "per100g": {
      "calories": 80,
      "protein": 1.8,
      "carbs": 18,
      "fat": 0.8
    }
  },
  "garlic": {
    "per100g": {
      "calories": 149,
      "protein": 6.4,
      "carbs": 33,
      "fat": 0.5
    }
  },
  "green_chilli": {
    "per100g": {
      "calories": 40,
      "protein": 2,
      "carbs": 9,
      "fat": 0.2
    }
  },
  "lemon": {
    "per100g": {
      "calories": 29,
      "protein": 1.1,
      "carbs": 9,
      "fat": 0.3
    }
  },
  "lime": {
    "per100g": {
      "calories": 30,
      "protein": 0.7,
      "carbs": 11,
      "fat": 0.2
    }
  },
  "pomegranate_arils": {
    "per100g": {
      "calories": 83,
      "protein": 1.7,
      "carbs": 19,
      "fat": 1.2
    }
  }
} satisfies Record<string, NutritionEntry>;

export const FOOD_ALIASES: Record<string, string> = {
  "eggs": "egg",
  "chicken_breast": "chicken",
  "chickn": "chicken",
  "chiken": "chicken",
  "chciken": "chicken",
  "brocli": "broccoli",
  "brocolli": "broccoli",
  "bananas": "banana",
  "paneer_tikka": "paneer",
  "chapati": "roti",
  "curd": "yogurt",
  "french_fries": "fries",
  "soft_drink": "soda",
  "coke": "soda",
  "chicken_gravy": "chicken_curry",
  "mutton_gravy": "mutton_curry",
  "dal": "dal_tadka",
  "rajma": "rajma_curry",
  "chole": "chana_masala",
  "paneer_masala": "paneer_butter_masala",
  "chutney": "mint_chutney",
  "coco_chutney": "coconut_chutney",
  "pudina_chutney": "mint_chutney",
  "groundnut_chutney": "peanut_chutney",
  "chowmein": "noodles",
  "manchurian_noodles": "noodles",
  "momo": "momos",
  "pastry": "cake",
  "biscuit": "cookies",
  "egg_white": "boiled_egg_white",
  "whey": "whey_protein",
  "protein_powder": "whey_protein",
  "grilled_chicken_breast": "grilled_chicken",
  "curd_greek": "greek_yogurt",
  "chickpeas": "boiled_chickpeas",
  "gajar": "carrot",
  "tamatar": "tomato",
  "pyaz": "onion",
  "aloo": "potato",
  "gobi": "cauliflower",
  "shimla_mirch": "capsicum",
  "baigan": "brinjal",
  "methi_saag": "methi",
  "chana": "chickpea",
  "moong": "moong_dal",
  "masoor": "masoor_dal",
  "urad": "urad_dal",
  "tuvar": "toor_dal",
  "tur_dal": "toor_dal",
  "hara_dhaniya": "coriander",
  "dahi": "curd",
  "chawal": "white_rice_cooked",
  "cooked_rice": "white_rice_cooked",
  "protein_shake": "whey_protein"
};

export function normalizeFoodKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function resolveFoodKey(query: string): string | null {
  const key = normalizeFoodKey(query);
  if (!key) return null;
  if (NUTRITION_DB[key]) return key;
  const alias = FOOD_ALIASES[key];
  if (alias && NUTRITION_DB[alias]) return alias;
  return null;
}

export function searchNutritionCatalog(
  query: string,
  limit = 12,
): Array<{ key: string; label: string; entry: NutritionEntry }> {
  const q = normalizeFoodKey(query);
  if (!q) return [];
  const results: Array<{ key: string; label: string; entry: NutritionEntry; score: number }> = [];

  for (const [key, entry] of Object.entries(NUTRITION_DB)) {
    const label = entry.label ?? key.replace(/_/g, ' ');
    let score = 0;
    if (key === q) score = 100;
    else if (key.startsWith(q)) score = 80;
    else if (key.includes(q)) score = 60;
    else if (label.toLowerCase().includes(query.trim().toLowerCase())) score = 40;
    if (score > 0) results.push({ key, label, entry, score });
  }

  for (const [alias, target] of Object.entries(FOOD_ALIASES)) {
    if (!alias.includes(q) && alias !== q) continue;
    const entry = NUTRITION_DB[target];
    if (!entry) continue;
    if (results.some((r) => r.key === target)) continue;
    results.push({
      key: target,
      label: target.replace(/_/g, ' '),
      entry,
      score: alias === q ? 90 : 50,
    });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ key, label, entry }) => ({ key, label, entry }));
}

export function scaleNutritionEntry(
  entry: NutritionEntry,
  grams: number,
): NutritionMacros & { junk?: boolean; neutral?: boolean } {
  const g = Math.max(0, Number(grams) || 0);
  if (entry.perUnit) {
    const unitGrams = entry.perUnit.grams && entry.perUnit.grams > 0 ? entry.perUnit.grams : g || 1;
    const units = unitGrams > 0 ? g / unitGrams : 1;
    return {
      calories: Math.round(entry.perUnit.calories * units * 10) / 10,
      protein: Math.round(entry.perUnit.protein * units * 10) / 10,
      carbs: Math.round(entry.perUnit.carbs * units * 10) / 10,
      fat: Math.round(entry.perUnit.fat * units * 10) / 10,
      junk: entry.junk,
      neutral: entry.neutral,
    };
  }
  const baseMacros = entry.per100g ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const factor = g / 100;
  return {
    calories: Math.round(baseMacros.calories * factor * 10) / 10,
    protein: Math.round(baseMacros.protein * factor * 10) / 10,
    carbs: Math.round(baseMacros.carbs * factor * 10) / 10,
    fat: Math.round(baseMacros.fat * factor * 10) / 10,
    junk: entry.junk,
    neutral: entry.neutral,
  };
}

export function listPopularFoods(limit = 16): Array<{ key: string; label: string }> {
  const popular = [
    'egg',
    'chicken',
    'rice',
    'oats',
    'roti',
    'banana',
    'milk',
    'paneer',
    'greek_yogurt',
    'whey_protein',
    'apple',
    'potato',
    'fish',
    'broccoli',
    'peanut_butter',
    'tofu',
  ];
  return popular
    .filter((k) => NUTRITION_DB[k])
    .slice(0, limit)
    .map((key) => ({ key, label: key.replace(/_/g, ' ') }));
}
