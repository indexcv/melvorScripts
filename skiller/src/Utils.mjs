const {loadModule} = mod.getContext(import.meta);
const {melvorRealm} = await loadModule('src/Consts.mjs');

function getAction(skillId, id) {
    return game[skillId].actions.getObjectByID(id);
}

function getMasteryLevel(skillId, action) {
    return game[skillId].getMasteryLevel(action);
}

function getMasteryXP(skillId, action) {
    return game[skillId].getMasteryXP(action);
}

function getXPRate(skillId, action) {
    const XP = action.realm === melvorRealm
        ? game[skillId].modifyXP(action.baseExperience)
        : game[skillId].modifyAbyssalXP(action.baseAbyssalExperience);

    if (skillId === 'woodcutting') {
        return XP / game[skillId].getTreeInterval(action);
    } else if (skillId === 'fishing') {
        return XP / ((game[skillId].getMinFishInterval(action) + game[skillId].getMaxFishInterval(action)) * 0.5);
    } else if (skillId === 'firemaking') {
        return XP / game[skillId].modifyInterval(action.baseInterval, action);
    } else if (skillId === 'cooking') {
        return XP / game[skillId].getRecipeCookingInterval(action)
    } else if (skillId === 'astrology') {
        return XP / game[skillId].getConstellationInterval(action);
    }

    return XP / game[skillId].modifyInterval(game[skillId].baseInterval, action);
}

function bankQty(item) {
    return game.bank.getQty(item);
}

function getProduct(skillId, action) {
    if (skillId === 'firemaking') {
        return action.log;
    }
    if (skillId === 'herblore') {
        return action.potions[3];
    }

    return action.product;
}

export {getAction, getMasteryLevel, getMasteryXP, getXPRate, bankQty, getProduct};