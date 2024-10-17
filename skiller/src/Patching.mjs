const {loadModule, patch} = mod.getContext(import.meta);
const {
    SKILLS,
    priorityTypes,
    hasItA
} = await loadModule('src/Consts.mjs');
const {
    getMasteryLevel,
    getMasteryXP,
    getXPRate,
    bankQty,
    getProduct
} = await loadModule('src/Utils.mjs');

let actCheckCount = 0;
const checkThresh = 5000;

//FIXME: recipe items missing stops, all ????
// [] woodcutting
// [] fishing
// [] firemaking
// [] cooking
// [] mining
// [x] smithing
// [] thieving
// [x] fletching
// [x] crafting
// [x] runecrafting
// [x] herblore
// [] astrology
// [] harvesting

//methods
function checkAction(skillId, action) {
    const selectedRealm = skillerMod.config[skillId].selectedRealm;
    const isBasicUnlockedAndSameRealm = game[skillId].isBasicSkillRecipeUnlocked(action)
        && action.realm.id === selectedRealm;

    if (skillId === 'woodcutting') {
        return game[skillId].isTreeUnlocked(action)
            && action.realm.id === selectedRealm;
    } else if (skillId === 'fishing') {
        return ((action.area.isSecret && game[skillId].secretAreaUnlocked) || !action.area.isSecret)
            && ((action.area.requiredItem && game.combat.player.equipment.checkForItem(action.area.requiredItem)) || !action.area.requiredItem)
            && ((action.area.poiRequirement && action.area.poiRequirement.isMet()) || !action.area.poiRequirement)
            && isBasicUnlockedAndSameRealm;
    } else if (skillId === 'firemaking') {
        return bankQty(action.log) > 0
            && isBasicUnlockedAndSameRealm;
    } else if (skillId === 'cooking') {
        return game[skillId].getRecipeCosts(action).checkIfOwned()
            && ((action.category.upgradeRequired && action.category.upgradeOwned) || !action.category.upgradeRequired)
            && isBasicUnlockedAndSameRealm;
    } else if (skillId === 'mining') {
        return game[skillId].canMineOre(action)
            && action.currentHP !== 0
            && action.realm.id === selectedRealm;
    } else if (skillId === 'thieving') {
        const maxHit = Math.floor(numberMultiplier * action.maxHit * (1 - game.combat.player.equipmentStats.damageReduction / 100));
        //Don't pickpocket things that can kill you unless success rate is 100%
        return !(game.combat.player.autoEatThreshold < maxHit && game[skillId].getNPCSuccessRate(action) < 100)
            && isBasicUnlockedAndSameRealm;
    } else if (skillId === 'astrology') {
        return isBasicUnlockedAndSameRealm;
    } else if (skillId === 'harvesting') {
        return game[skillId].canHarvestVein(action)
            && action.realm.id === selectedRealm;
    }

    return game[skillId].getRecipeCosts(action).checkIfOwned() && isBasicUnlockedAndSameRealm;
}

function getBestAction(skill) {
    const skillId = skill.id;
    const selectedRealm = skillerMod.config[skillId].selectedRealm;
    const priorityType = skillerMod.config[skillId].priorityType;
    const priority = skillerMod.config[skillId][selectedRealm].priority.map(idx => game[skillId].actions.allObjects[idx]);
    const disabledActions = skillerMod.config[skillId][selectedRealm].disabledActions.map(idx => game[skillId].actions.allObjects[idx]);
    let actions = [];

    if (!skillerMod.config[skillId][selectedRealm].masteryDone && priorityType === priorityTypes.mastery.id) {
        actions = game[skillId].actions
            .filter(thisAction => thisAction.realm.id === selectedRealm && !disabledActions.includes(thisAction) && checkAction(skillId, thisAction) && getMasteryLevel(skillId, thisAction) < 99)
            .sort((a, b) => getMasteryXP(skillId, b) - getMasteryXP(skillId, a));

        if (actions.length === 0) {
            skillerMod.store.setMasteryDone(skillId, selectedRealm);
        }
    } else if (!skillerMod.config[skillId][selectedRealm].mastery && priorityType === priorityTypes.masteryLow.id) {
        actions = game[skillId].actions
            .filter(thisAction => thisAction.realm.id === selectedRealm && !disabledActions.includes(thisAction) && checkAction(skillId, thisAction) && getMasteryLevel(skillId, thisAction) < 99)
            .sort((a, b) => getMasteryXP(skillId, a) - getMasteryXP(skillId, b));

        if (actions.length === 0) {
            skillerMod.store.setMasteryDone(skillId, selectedRealm);
        }
    } else if (skill.includeQuantity && priorityType === priorityTypes.lowestQuantity.id) {
        actions = game[skillId].actions
            .filter(thisAction => thisAction.realm.id === selectedRealm && !disabledActions.includes(thisAction) && checkAction(skillId, thisAction))
            .sort((a, b) => bankQty(getProduct(skillId, a)) - bankQty(getProduct(skillId, b)));
    } else if (priorityType === priorityTypes.bestXP.id) {
        actions = game[skillId].actions
            .filter(thisAction => thisAction.realm.id === selectedRealm && !disabledActions.includes(thisAction) && checkAction(skillId, thisAction))
            .sort((a, b) => getXPRate(skillId, b) - getXPRate(skillId, a));
    } else if (priorityType === priorityTypes.custom.id) {
        actions = priority.filter(thisAction => thisAction.realm.id === selectedRealm && !disabledActions.includes(thisAction) && checkAction(skillId, thisAction));
    } else if (priorityType === priorityTypes.intensity.id) {
        actions = game[skillId].actions
            .filter(thisAction => thisAction.realm.id === selectedRealm && !disabledActions.includes(thisAction) && checkAction(skillId, thisAction) && thisAction.intensityPercent < 100)
            .sort((a, b) => b.intensityPercent - a.intensityPercent);

        if (actions.length === 0) {
            skillerMod.store.setIntensityDone(skillId, selectedRealm)
        }
    } else if (priorityType === priorityTypes.intensityLow.id) {
        actions = game[skillId].actions
            .filter(thisAction => thisAction.realm.id === selectedRealm && !disabledActions.includes(thisAction) && checkAction(skillId, thisAction) && thisAction.intensityPercent < 100)
            .sort((a, b) => a.intensityPercent - b.intensityPercent);

        if (actions.length === 0) {
            skillerMod.store.setIntensityDone(skillId, selectedRealm)
        }
    }

    if (skill.returnMultiple) {
        return actions;
    } else {
        return actions[0];
    }
}

function patchSkill(skillId) {
    let skill = SKILLS.find(skill => skill.id === skillId);

    if (skillerMod.config[skillId].enabled) {
        try {
            actCheckCount += game[skillId].actionInterval;

            if (skillId === 'woodcutting' && actCheckCount >= checkThresh) {
                const treeArray = getBestAction(skill)
                const treeCount = Math.min(game[skillId].treeCutLimit, treeArray.length)
                let goodCount = 0;

                for (let i = 0; i < treeCount; i++) {
                    if (game[skillId].activeTrees.has(treeArray[i])) {
                        goodCount++;
                    }
                }

                if (goodCount < treeCount) {
                    game[skillId].stop()
                    for (let i = 0; i < treeCount; i++) {
                        game[skillId].selectTree(treeArray[i]);
                    }
                }

                actCheckCount = 0;
            } else if (skillId === 'fishing' && actCheckCount >= checkThresh) {
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].activeFish.id !== bestAction.id) {
                    game[skillId].onAreaFishSelection(bestAction.area, bestAction);
                    game[skillId].onAreaStartButtonClick(bestAction.area);
                }

                actCheckCount = 0;
            } else if (skillId === 'firemaking' && (checkAction(skillId, game[skillId].activeRecipe) || actCheckCount >= checkThresh)) {
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].activeRecipe.id !== bestAction.id) {
                    game[skillId].selectLog(bestAction);
                    game[skillId].burnLog();
                }

                actCheckCount = 0;
            } else if (skillId === 'cooking' && (checkAction(skillId, game[skillId].activeRecipe) || actCheckCount >= checkThresh)) {
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].activeRecipe.id !== bestAction.id) {
                    game[skillId].onRecipeSelectionClick(bestAction);
                    game[skillId].onActiveCookButtonClick(bestAction.category);
                }

                actCheckCount = 0;
            } else if (skillId === 'mining' && (game[skillId].activeRock.currentHP === 0 || actCheckCount >= checkThresh)) {
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].activeRock.id !== bestAction.id) {
                    game[skillId].onRockClick(bestAction);
                }

                actCheckCount = 0;
            } else if (skillId === 'thieving' && !game[skillId].isStunned && actCheckCount >= checkThresh) {
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].currentNPC.id !== bestAction.id) {
                    thievingMenu.selectNPC(bestAction, bestAction.area, game[skillId]);
                    game[skillId].startThieving(bestAction.area, bestAction);
                }

                actCheckCount = 0;
            } else if (skillId === 'astrology' && actCheckCount >= checkThresh) {
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].activeConstellation.id !== bestAction.id) {
                    game[skillId].studyConstellationOnClick(bestAction);
                }

                actCheckCount = 0;
            } else if (skillId === 'harvesting' && actCheckCount >= checkThresh) {
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].activeVein.id !== bestAction.id) {
                    game[skillId].onVeinClick(bestAction);
                }

                actCheckCount = 0;
            } else if (!skill.hasOwnPatch && (checkAction(skillId, game[skillId].activeRecipe) || actCheckCount >= checkThresh)) { //fixme: viia checkAction to bestAction külge???
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].activeRecipe.id !== bestAction.id) {
                    game[skillId].selectRecipeOnClick(bestAction);
                    game[skillId].createButtonOnClick();
                }

                actCheckCount = 0;
            }
        } catch (err) {
            console.log({msg: `${id} encountered an error`, exception: err})
        }
    }
}

patch(Woodcutting, 'selectTree').after(function (o, action) {
    skillerMod.store.setSelectedRealm('woodcutting', action.realm.id)
});
patch(Woodcutting, 'postAction').after(function () {
    patchSkill('woodcutting')
});

patch(Fishing, 'onAreaStartButtonClick').after(function (o, area) {
    skillerMod.store.setSelectedRealm('fishing', area.realm.id)
});
patch(Fishing, 'postAction').after(function () {
    patchSkill('fishing')
});

patch(Firemaking, 'burnLog').after(function () {
    skillerMod.store.setSelectedRealm('firemaking', game['firemaking'].selectedRecipe.realm.id)
});
patch(Firemaking, 'postAction').after(function () {
    patchSkill('firemaking')
});

patch(Cooking, 'onActiveCookButtonClick').after(function (o, category) {
    skillerMod.store.setSelectedRealm('cooking', game['cooking'].selectedRecipes.get(category).realm.id)
});
patch(Cooking, 'postAction').after(function () {
    patchSkill('cooking')
});

patch(Mining, 'onRockClick').after(function (o, action) {
    skillerMod.store.setSelectedRealm('mining', action.realm.id)
});
patch(Mining, 'postAction').after(function () {
    patchSkill('mining')
});

patch(Smithing, 'createButtonOnClick').after(function () {
    skillerMod.store.setSelectedRealm('smithing', game['smithing'].selectedRecipe.realm.id)
});
patch(Smithing, 'postAction').after(function () {
    patchSkill('smithing')
});

patch(Thieving, 'startThieving').after(function (o, area, npc) {
    skillerMod.store.setSelectedRealm('thieving', npc.realm.id)
});
patch(Thieving, 'postAction').after(function () {
    patchSkill('thieving')
});

patch(Fletching, 'createButtonOnClick').after(function () {
    skillerMod.store.setSelectedRealm('fletching', game['fletching'].selectedRecipe.realm.id)
});
patch(Fletching, 'postAction').after(function () {
    patchSkill('fletching')
});

patch(Crafting, 'createButtonOnClick').after(function () {
    skillerMod.store.setSelectedRealm('crafting', game['crafting'].selectedRecipe.realm.id)
});
patch(Crafting, 'postAction').after(function () {
    patchSkill('crafting')
});

patch(Runecrafting, 'createButtonOnClick').after(function () {
    skillerMod.store.setSelectedRealm('runecrafting', game['runecrafting'].selectedRecipe.realm.id)
});
patch(Runecrafting, 'postAction').after(function () {
    patchSkill('runecrafting')
});

patch(Herblore, 'createButtonOnClick').after(function () {
    skillerMod.store.setSelectedRealm('herblore', game['herblore'].selectedRecipe.realm.id)
});
patch(Herblore, 'postAction').after(function () {
    patchSkill('herblore')
});


patch(Astrology, 'studyConstellationOnClick').after(function (o, action) {
    skillerMod.store.setSelectedRealm('astrology', action.realm.id)
});
patch(Astrology, 'postAction').after(function () {
    patchSkill('astrology')
});

if (hasItA) {
    patch(Harvesting, 'onVeinClick').after(function (o, action) {
        skillerMod.store.setSelectedRealm('harvesting', action.realm.id)
    });
    patch(Harvesting, 'postAction').after(function () {
        patchSkill('harvesting')
    });
}