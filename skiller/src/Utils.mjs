const {loadModule} = mod.getContext(import.meta);
const {melvorRealm} = await loadModule('src/Consts.mjs');

function getAction(skillName, id) {
    return game[skillName].actions.getObjectByID(id);
}

function getMasteryLevel(skillName, action) {
    return game[skillName].getMasteryLevel(action);
}

function getMasteryXP(skillName, action) {
    return game[skillName].getMasteryXP(action);
}

function getXPRate(skillName, action) {
    const XP = game[skillName].currentRealm.id === melvorRealm.id
        ? game[skillName].modifyXP(action.baseExperience)
        : game[skillName].modifyAbyssalXP(action.baseAbyssalExperience);

    if (skillName === 'woodcutting') {
        return XP / game[skillName].getTreeInterval(action);
    } else if (skillName === 'fishing') {
        return XP / ((game[skillName].getMinFishInterval(action) + game[skillName].getMaxFishInterval(action)) * 0.5);
    } else if (skillName === 'firemaking') {
        return XP / game[skillName].modifyInterval(action.baseInterval, action);
    } else if (skillName === 'cooking') {
        return XP / game[skillName].getRecipeCookingInterval(action)
    } else if (skillName === 'astrology') {
        return XP / game[skillName].getConstellationInterval(action);
    }

    return XP / game[skillName].modifyInterval(game[skillName].baseInterval, action);
}

function bankQty(item) {
    return game.bank.getQty(item);
}

function getProduct(skillName, action) {
    if (skillName === 'firemaking') {
        return action.log;
    }
    if (skillName === 'herblore') {
        return action.potions[3];
    }

    return action.product;
}

export {getAction, getMasteryLevel, getMasteryXP, getXPRate, bankQty, getProduct};