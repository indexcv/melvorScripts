const {loadModule, patch, settings} = mod.getContext(import.meta);
const {SKILLS, priorityTypes, hasAoD, hasItA} = await loadModule('src/Consts.mjs');
const {getMasteryLevel, getMasteryXP, getXPRate, bankQty, getProduct} = await loadModule('src/Utils.mjs');

let actCheckCount = 0;
let checkThreshMultiplier = settings.section('General').get('checkThreshMultiplier') || 10;

//TODO: archaeology???????????? (const found = game.stats.itemFindCount(item);)
//TODO: cartography???????????? catyography:L1778 mapUpgradeAction()
function multiplyRecipeCostsAndCheckIfOwned(recipeCosts) {
    recipeCosts._items.forEach((k, v) => {
        recipeCosts.addItem(v, (k * checkThreshMultiplier) - k);
    })
    return recipeCosts.checkIfOwned()
}

//methods
function checkAction(skillId, action) {
    const selectedRealm = game.currentRealm.id;
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
        return bankQty(action.log) > checkThreshMultiplier
            && isBasicUnlockedAndSameRealm;
    } else if (skillId === 'cooking') {
        return multiplyRecipeCostsAndCheckIfOwned(game[skillId].getRecipeCosts(action))
            && ((action.category.upgradeRequired && action.category.upgradeOwned) || !action.category.upgradeRequired)
            && isBasicUnlockedAndSameRealm;
    } else if (skillId === 'mining') {
        return game[skillId].canMineOre(action)
            && action.currentHP !== 0
            && action.realm.id === selectedRealm;
    } else if (skillId === 'thieving') {
        const maxHit = Math.floor(numberMultiplier * action.maxHit * (1 - game.combat.player.equipmentStats.damageReduction / 100));
        //Don't pickpocket things that can kill you unless success rate is 100%
        return !(game.combat.player.autoEatThreshold < maxHit && game[skillId].getNPCSuccessRate(action) < settings.section('General').get('thievingSuccessRate'))
            && isBasicUnlockedAndSameRealm;
    } else if (skillId === 'summoning') {
        return (multiplyRecipeCostsAndCheckIfOwned(game[skillId].getRecipeCosts(action))
                || (action.nonShardItemCosts.length > 0
                    && action.nonShardItemCosts.some(i => multiplyRecipeCostsAndCheckIfOwned(game[skillId].getAltRecipeCosts(action, i)))))
            && isBasicUnlockedAndSameRealm;
    } else if (skillId === 'astrology') {
        return isBasicUnlockedAndSameRealm;
    } else if (skillId === 'archaeology') {
        return game[skillId].canExcavate(action)
            && isBasicUnlockedAndSameRealm;
    } else if (skillId === 'harvesting') {
        return game[skillId].canHarvestVein(action)
            && action.realm.id === selectedRealm;
    }

    return  multiplyRecipeCostsAndCheckIfOwned(game[skillId].getRecipeCosts(action)) && isBasicUnlockedAndSameRealm;
}

function getBestAction(skill) {
    const skillId = skill.id;
    const selectedRealm = game.currentRealm.id;
    const priorityType = skillerMod.config[skillId].priorityType;
    const priority = skillerMod.config[skillId][selectedRealm].priority.map(idx => game[skillId].actions.allObjects[idx]);
    const disabledActions = skillerMod.config[skillId][selectedRealm].disabledActions.map(idx => game[skillId].actions.allObjects[idx]);
    let actions = [];

    if (!skillerMod.config[skillId][selectedRealm].masteryDone && priorityType === priorityTypes.mastery.id) {
        actions = game[skillId].actions
            .filter(thisAction => thisAction.realm.id === selectedRealm && !disabledActions.includes(thisAction) && checkAction(skillId, thisAction) && getMasteryLevel(skillId, thisAction) < 99)
            .sort((a, b) => getMasteryXP(skillId, b) - getMasteryXP(skillId, a));

        if (game[skillId].actions.filter(thisAction => thisAction.realm.id === selectedRealm && getMasteryLevel(skillId, thisAction) < 99).length === 0) {
            skillerMod.store.setMasteryDone(skillId, selectedRealm);
        }
        if (actions.length === 0) {
            skillerMod.store.setPriorityType(skillId, priorityTypes.bestXP.id)
        }
    } else if (!skillerMod.config[skillId][selectedRealm].mastery && priorityType === priorityTypes.masteryLow.id) {
        actions = game[skillId].actions
            .filter(thisAction => thisAction.realm.id === selectedRealm && !disabledActions.includes(thisAction) && checkAction(skillId, thisAction) && getMasteryLevel(skillId, thisAction) < 99)
            .sort((a, b) => getMasteryXP(skillId, a) - getMasteryXP(skillId, b));

        if (game[skillId].actions.filter(thisAction => thisAction.realm.id === selectedRealm && getMasteryLevel(skillId, thisAction) < 99).length === 0) {
            skillerMod.store.setMasteryDone(skillId, selectedRealm);
        }
        if (actions.length === 0) {
            skillerMod.store.setPriorityType(skillId, priorityTypes.bestXP.id)
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

        if (game[skillId].actions.filter(thisAction => thisAction.realm.id === selectedRealm && thisAction.intensityPercent < 100).length === 0) {
            skillerMod.store.setIntensityDone(skillId, selectedRealm)
        }
        if (actions.length === 0) {
            skillerMod.store.setPriorityType(skillId, priorityTypes.bestXP.id)
        }
    } else if (priorityType === priorityTypes.intensityLow.id) {
        actions = game[skillId].actions
            .filter(thisAction => thisAction.realm.id === selectedRealm && !disabledActions.includes(thisAction) && checkAction(skillId, thisAction) && thisAction.intensityPercent < 100)
            .sort((a, b) => a.intensityPercent - b.intensityPercent);

        if (game[skillId].actions.filter(thisAction => thisAction.realm.id === selectedRealm && thisAction.intensityPercent < 100).length === 0) {
            skillerMod.store.setIntensityDone(skillId, selectedRealm)
        }
        if (actions.length === 0) {
            skillerMod.store.setPriorityType(skillId, priorityTypes.bestXP.id)
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
            let checkThresh = game[skillId].actionInterval * checkThreshMultiplier;
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
            } else if (skillId === 'firemaking' && (!checkAction(skillId, game[skillId].activeRecipe) || actCheckCount >= checkThresh)) {
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].activeRecipe.id !== bestAction.id) {
                    game[skillId].selectLog(bestAction);
                    game[skillId].burnLog();
                }

                actCheckCount = 0;
            } else if (skillId === 'cooking' && (!checkAction(skillId, game[skillId].activeRecipe) || actCheckCount >= checkThresh)) {
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
            } else if (skillId === 'summoning' && actCheckCount >= checkThresh) {
                const bestAction = getBestAction(skill);
                let bestNonShardCost = undefined;

                if (bestAction !== undefined) {
                    bestNonShardCost = bestAction.nonShardItemCosts.findLast(i => multiplyRecipeCostsAndCheckIfOwned(game[skillId].getAltRecipeCosts(bestAction, i)));
                }

                if (bestAction !== undefined && game[skillId].activeRecipe.id !== bestAction.id) {
                    game[skillId].selectRecipeOnClick(bestAction);
                    if (bestNonShardCost !== undefined) {
                        game[skillId].selectNonShardCostOnClick(bestAction.nonShardItemCosts.indexOf(bestNonShardCost))
                    }
                    game[skillId].createButtonOnClick();
                } else if(bestAction !== undefined && game[skillId].activeRecipe.id === bestAction.id && bestNonShardCost !== undefined && game[skillId].activeNonShardCost.id !== bestNonShardCost.id) {
                    game[skillId].selectNonShardCostOnClick(bestAction.nonShardItemCosts.indexOf(bestNonShardCost));
                    game[skillId].createButtonOnClick();
                }

                actCheckCount = 0;
            } else if (skillId === 'astrology' && actCheckCount >= checkThresh) {
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].activeConstellation.id !== bestAction.id) {
                    game[skillId].studyConstellationOnClick(bestAction);
                }

                actCheckCount = 0;
            } else if(skillId === 'archaeology' && actCheckCount >= checkThresh) {
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].currentDigSite.id !== bestAction.id) {
                    game[skillId].startDigging(bestAction);
                }

                actCheckCount = 0;
            } else if (skillId === 'harvesting' && actCheckCount >= checkThresh) {
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].activeVein.id !== bestAction.id) {
                    game[skillId].onVeinClick(bestAction);
                }

                actCheckCount = 0;
            } else if (!skill.hasOwnPatch && (!checkAction(skillId, game[skillId].activeRecipe) || actCheckCount >= checkThresh)) {
                const bestAction = getBestAction(skill);

                if (bestAction !== undefined && game[skillId].activeRecipe.id !== bestAction.id) {
                    game[skillId].selectRecipeOnClick(bestAction);
                    game[skillId].createButtonOnClick();
                }

                actCheckCount = 0;
            }
        } catch (err) {
            console.error({msg: `[Skiller] encountered an error`, exception: err})
        }
    }
}

patch(Woodcutting, 'postAction').after(function () {
    patchSkill('woodcutting')
});

patch(Fishing, 'postAction').after(function () {
    patchSkill('fishing')
});

patch(Firemaking, 'postAction').after(function () {
    patchSkill('firemaking')
});

patch(Cooking, 'postAction').after(function () {
    patchSkill('cooking')
});

patch(Mining, 'postAction').after(function () {
    patchSkill('mining')
});

patch(Smithing, 'postAction').after(function () {
    patchSkill('smithing')
});

patch(Thieving, 'postAction').after(function () {
    patchSkill('thieving')
});

patch(Fletching, 'postAction').after(function () {
    patchSkill('fletching')
});

patch(Crafting, 'postAction').after(function () {
    patchSkill('crafting')
});

patch(Runecrafting, 'postAction').after(function () {
    patchSkill('runecrafting')
});

patch(Herblore, 'postAction').after(function () {
    patchSkill('herblore')
});

patch(Summoning, 'postAction').after(function () {
    patchSkill('summoning')
});

patch(Astrology, 'postAction').after(function () {
    patchSkill('astrology')
});

if (hasAoD) {
    patch(Archaeology, 'postAction').after(function () {
        patchSkill('archaeology')
    });
}

if (hasItA) {
    patch(Harvesting, 'postAction').after(function () {
        patchSkill('harvesting')
    });
}