export const SKILLS = [
    {
        id: 'woodcutting',
        name: 'Woodcutting',
        hasOwnPatch: true,
        includeQuantity: true,
        returnMultiple: true,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: true
    },
    {
        id: 'fishing',
        name: 'Fishing',
        hasOwnPatch: true,
        includeQuantity: true,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: true
    },
    {
        id: 'firemaking',
        name: 'Firemaking',
        hasOwnPatch: true,
        includeQuantity: false,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: false
    },
    {
        id: 'cooking',
        name: 'Cooking',
        hasOwnPatch: true,
        includeQuantity: true,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: true
    },
    {
        id: 'mining',
        name: 'Mining',
        hasOwnPatch: true,
        includeQuantity: true,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: true
    },
    {
        id: 'smithing',
        name: 'Smithing',
        hasOwnPatch: false,
        includeQuantity: true,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: true
    },
    {
        id: 'thieving',
        name: 'Thieving',
        hasOwnPatch: true,
        includeQuantity: false,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: true
    },
    {
        id: 'fletching',
        name: 'Fletching',
        hasOwnPatch: false,
        includeQuantity: true,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: true
    },
    {
        id: 'crafting',
        name: 'Crafting',
        hasOwnPatch: false,
        includeQuantity: true,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: true
    },
    {
        id: 'runecrafting',
        name: 'Runecrafting',
        hasOwnPatch: false,
        includeQuantity: true,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: true
    },
    {
        id: 'herblore',
        name: 'Herblore',
        hasOwnPatch: false,
        includeQuantity: true,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: true
    },
    {
        id: 'summoning',
        name: 'Summoning',
        hasOwnPatch: true,
        includeQuantity: true,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: true
    },
    {
        id: 'astrology',
        name: 'Astrology',
        hasOwnPatch: true,
        includeQuantity: false,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: false
    },
    {
        id: 'archaeology',
        name: 'Archaeology',
        hasOwnPatch: true,
        includeQuantity: false,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: false,
        includeSellsFor: false
    },
    {
        id: 'harvesting',
        name: 'Harvesting',
        hasOwnPatch: true,
        includeQuantity: false,
        returnMultiple: false,
        hasMastery: true,
        hasIntensity: true,
        includeSellsFor: false
    }
];

export const priorityTypes = {
    custom: {
        id: 'custom',
        description: 'Custom priority',
        tooltip: 'Drag items to change their priority<br>Click items to disable/enable them'
    },
    mastery: {
        id: 'mastery',
        description: 'Highest mastery',
        tooltip: 'Items with maxed mastery are excluded<br>Click items to disable/enable them'
    },
    masteryLow: {
        id: 'masteryLow',
        description: 'Lowest mastery',
        tooltip: 'In case you wanted to work on Mastery from the other direction<br>Click items to disable/enable them'
    },
    intensity: {
        id: 'intensity',
        description: 'Highest intensity',
        tooltip: 'Items with maxed intensity are excluded<br>Click items to disable/enable them'
    },
    intensityLow: {
        id: 'intensityLow',
        description: 'Lowest intensity',
        tooltip: 'In case you wanted to work on Intensity from the other direction<br>Click items to disable/enable them'
    },
    lowestQuantity: {
        id: 'lowestQuantity',
        description: 'Lowest Quantity',
        tooltip: 'Items whatever you have the least of in your bank<br>Click items to disable/enable them'
    },
    bestXP: {
        id: 'bestXP',
        description: 'Best XP/Hr',
        tooltip: 'Target whatever gives the best XP/Hour.<br>Click items to disable/enable them'
    },
    sellsFor: {
        id: 'sellsFor',
        description: 'Highest sell value',
        tooltip: 'Target whatever gives the highest sell value.<br>Click items to disable/enable them'
    }
};

export const SKILL_ACTIONS = {},
    hasTot = cloudManager.hasTotHEntitlementAndIsEnabled,
    hasAoD = cloudManager.hasAoDEntitlementAndIsEnabled,
    hasItA = cloudManager.hasItAEntitlementAndIsEnabled,
    melvorRealm = game.realms.getObjectByID('melvorD:Melvor'),
    abyssalRealm = hasItA && game.realms.getObjectByID('melvorItA:Abyssal'),
    eternalRealm = hasItA && game.realms.getObjectByID('melvorItA:Eternal'),
    itARealms = [abyssalRealm, eternalRealm];