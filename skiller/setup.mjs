export function setup(ctx) {
    ctx.onCharacterSelectionLoaded(ctx => {
        const id = 'skiller';
        const title = "Skiller";

        const priorityTypes = {
            custom: {id: 'custom', description: 'Custom priority', tooltip: 'Drag items to change their priority<br>Click items to disable/enable them'},
            mastery: {id: 'mastery', description: 'Highest mastery', tooltip: 'Items with maxed mastery are excluded<br>Click items to disable/enable them'},
            masteryLow: {id: 'masteryLow', description: 'Lowest mastery', tooltip: 'In case you wanted to work on Mastery from the other direction<br>Click items to disable/enable them'},
            intensity:{id: 'intensity', description: 'Highest intensity', tooltip: 'Items with maxed intensity are excluded<br>Click items to disable/enable them'},
            intensityLow:{id: 'intensityLow', description: 'Lowest intensity', tooltip: 'In case you wanted to work on Intensity from the other direction<br>Click items to disable/enable them'},
            lowestQuantity: {id: 'lowestQuantity', description: 'Lowest Quantity', tooltip: 'Items whatever you have the least of in your bank<br>Click items to disable/enable them'},
            bestXP: {id: 'bestXP', description: 'Best XP/Hr', tooltip: 'Target whatever gives the best XP/Hour.<br>Click items to disable/enable them'}
        };

        //all skills: attack, strength, defence, hitpoints, ranged, altMagic, prayer, slayer, woodcutting, fishing, firemaking, cooking, mining, smithing,
        //            thieving, farming, fletching, crafting, runecrafting, herblore, agility, summoning, astrology, township, cartography, archaeology
        //mastery skills:  altMagic, woodcutting, fishing, firemaking, cooking, mining, smithing, thieving, farming, fletching, crafting, runecrafting,
        //                 herblore, agility, summoning, astrology, archaeology
        const SKILLS = [
            {id: 'woodcutting', name: 'Woodcutting', hasOwnPatch: true, includeQuantity: true, returnMultiple: true, hasMastery: true, hasIntensity: false},
            {id: 'fishing', name: 'Fishing', hasOwnPatch: true, includeQuantity: true, returnMultiple: false, hasMastery: true, hasIntensity: false},
            {id: 'firemaking', name: 'Firemaking', hasOwnPatch: true, includeQuantity: false, returnMultiple: false, hasMastery: true, hasIntensity: false},
            {id: 'cooking', name: 'Cooking', hasOwnPatch: true, includeQuantity: true, returnMultiple: false, hasMastery: true, hasIntensity: false},
            {id: 'mining', name: 'Mining', hasOwnPatch: true, includeQuantity: true, returnMultiple: false, hasMastery: true, hasIntensity: false},
            {id: 'smithing', name: 'Smithing', hasOwnPatch: false, includeQuantity: true, returnMultiple: false, hasMastery: true, hasIntensity: false},
            {id: 'thieving', name: 'Thieving', hasOwnPatch: true, includeQuantity: false, returnMultiple: false, hasMastery: true, hasIntensity: false},
            {id: 'fletching', name: 'Fletching', hasOwnPatch: false, includeQuantity: true, returnMultiple: false, hasMastery: true, hasIntensity: false},
            {id: 'crafting', name: 'Crafting', hasOwnPatch: false, includeQuantity: true, returnMultiple: false, hasMastery: true, hasIntensity: false},
            {id: 'runecrafting', name: 'Runecrafting', hasOwnPatch: false, includeQuantity: true, returnMultiple: false, hasMastery: true, hasIntensity: false},
            {id: 'herblore', name: 'Herblore', hasOwnPatch: false, includeQuantity: true, returnMultiple: false, hasMastery: true, hasIntensity: false},
            {id: 'astrology', name: 'Astrology', hasOwnPatch: true, includeQuantity: false, returnMultiple: false, hasMastery: true, hasIntensity: false},
            {id: 'harvesting', name: 'Harvesting', hasOwnPatch: true, includeQuantity: false, returnMultiple: false, hasMastery: true, hasIntensity: true},
        ];

        const PRIORITY_ARRAYS = {};
        const SKILL_ACTIONS = {};

        let actCheckCount = 0;
        const checkThresh = 5000;

        //config
        const priorityToConfig = (skillName, arr) => arr.map(action => game[skillName].actions.allObjects.indexOf(action));
        const priorityFromConfig = (skillName, arr) => arr.map(actionNdx => game[skillName].actions.allObjects[actionNdx]);
        let config = {};

        //init Array's
        SKILLS.forEach(skill => {
            SKILL_ACTIONS[skill.id] = game[skill.id].actions.allObjects.sort((a, b) => b.level - a.level);
            PRIORITY_ARRAYS[skill.id] = [...SKILL_ACTIONS[skill.id]];

            config[skill.id] = {
                // visible: true,
                enabled: false,
                collapsed: false,
                masteryDone: false,
                intensityDone: false,
                priorityType: priorityTypes.custom.id,
                priority: priorityToConfig(skill.id, PRIORITY_ARRAYS[skill.id]),
                disabledActions: {}
            }
        });

        const storeConfig = () => {
            ctx.characterStorage.setItem('config', config);
        };

        const loadConfig = () => {
            const storedConfig = ctx.characterStorage.getItem('config');

            if (!storedConfig) {
                return;
            }

            config = {...config, ...storedConfig};

            SKILLS.forEach(skill => {
                if (config[skill.id] && config[skill.id].priority) {
                    PRIORITY_ARRAYS[skill.id] = priorityFromConfig(skill.id, config[skill.id].priority);
                }
                if (!config[skill.id].disabledActions) {
                    config[skill.id].disabledActions = {}
                }
                if (skill.hasMastery && !config[skill.id].masteryDone) {
                    config[skill.id].masteryDone = game[skill.id].actions.filter(thisAction => getMasteryLevel(skill.id, thisAction) < 99).length === 0;
                }
                if (skill.hasIntensity && !config[skill.id].intensityDone) {
                    config[skill.id].intensityDone = game[skill.id].actions.filter(thisAction => thisAction.intensityPercent < 100).length === 0;
                }
            })

            if (config.hasOwnProperty('disabledActions')) {
                delete config.disabledActions;
            }
        };

        // utils
        const getAction = (skillName, id) => game[skillName].actions.getObjectByID(id);

        const getMasteryLevel = (skillName, action) => game[skillName].getMasteryLevel(action);
        const getMasteryXP = (skillName, action) => game[skillName].getMasteryXP(action);
        const getXPRate = (skillName, action) => {
            const XP = game[skillName].currentRealm.id === 'melvorD:Melvor'
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
        };

        const bankQty = (item) => game.bank.getQty(item);
        const getProduct = (skillName, action) => {
            if (skillName === 'firemaking') {
                return action.log;
            }
            if (skillName === 'herblore') {
                return action.potions[3];
            }

            return action.product;
        };

        //methods
        function checkAction(skillName, action) {
            const isBasicUnlockedAndSameRealm = game[skillName].isBasicSkillRecipeUnlocked(action)
                && action.realm === game[skillName].currentRealm;

            if (skillName === 'woodcutting') {
                return game[skillName].isTreeUnlocked(action)
                    && action.realm === game[skillName].currentRealm;
            } else if (skillName === 'fishing') {
                return ((action.area.isSecret && game[skillName].secretAreaUnlocked) || !action.area.isSecret)
                    && ((action.area.requiredItem && game.combat.player.equipment.checkForItem(action.area.requiredItem)) || !action.area.requiredItem)
                    && ((action.area.poiRequirement && action.area.poiRequirement.isMet()) || !action.area.poiRequirement)
                    && isBasicUnlockedAndSameRealm;
            } else if (skillName === 'firemaking') {
                return  bankQty(action.log) > 0
                    && isBasicUnlockedAndSameRealm;
            } else if (skillName === 'cooking') {
                return game[skillName].getRecipeCosts(action).checkIfOwned()
                    && ((action.category.upgradeRequired && action.category.upgradeOwned) || !action.category.upgradeRequired)
                    && isBasicUnlockedAndSameRealm;
            } else if (skillName === 'mining') {
                return  game[skillName].canMineOre(action)
                    && action.currentHP !== 0
                    && action.realm === game[skillName].currentRealm;
            } else if (skillName === 'thieving') {
                const maxHit = Math.floor(numberMultiplier * action.maxHit * (1 - game.combat.player.equipmentStats.damageReduction / 100));
                //Don't pickpocket things that can kill you unless success rate is 100%
                return !(game.combat.player.autoEatThreshold < maxHit && game[skillName].getNPCSuccessRate(action) < 100)
                    && isBasicUnlockedAndSameRealm;
            } else if (skillName === 'astrology') {
                return isBasicUnlockedAndSameRealm;
            } else if (skillName === 'harvesting') {
                return game[skillName].canHarvestVein(action)
                    && action.realm === game[skillName].currentRealm;
            }

            return game[skillName].getRecipeCosts(action).checkIfOwned() && isBasicUnlockedAndSameRealm;
        }
        function getBestAction(skill) {
            const skillName = skill.id;
            const priorityType = config[skillName].priorityType;
            let actions = [];

            if (!config[skillName].masteryDone && priorityType === priorityTypes.mastery.id) {
                actions = game[skillName].actions
                    .filter(thisAction => thisAction.realm === game[skillName].currentRealm && !config[skillName].disabledActions[thisAction.id] && checkAction(skillName, thisAction) && getMasteryLevel(skillName, thisAction) < 99)
                    .sort((a, b) => getMasteryXP(skillName, b) - getMasteryXP(skillName, a));

                if (actions.length === 0) {
                    config[skillName].masteryDone = true;
                }
            } else if (!config[skillName].mastery && priorityType === priorityTypes.masteryLow.id) {
                actions = game[skillName].actions
                    .filter(thisAction => thisAction.realm === game[skillName].currentRealm && !config[skillName].disabledActions[thisAction.id] && checkAction(skillName, thisAction) && getMasteryLevel(skillName, thisAction) < 99)
                    .sort((a, b) => getMasteryXP(skillName, a) - getMasteryXP(skillName, b));

                if (actions.length === 0) {
                    config[skillName].masteryDone = true;
                }
            } else if (skill.includeQuantity && priorityType === priorityTypes.lowestQuantity.id) {
                actions = game[skillName].actions
                    .filter(thisAction => thisAction.realm === game[skillName].currentRealm && !config[skillName].disabledActions[thisAction.id] && checkAction(skillName, thisAction))
                    .sort((a, b) => bankQty(getProduct(skillName, a)) - bankQty(getProduct(skillName, b)));
            } else if (priorityType === priorityTypes.bestXP.id) {
                actions = game[skillName].actions
                    .filter(thisAction => thisAction.realm === game[skillName].currentRealm && !config[skillName].disabledActions[thisAction.id] && checkAction(skillName, thisAction))
                    .sort((a, b) => getXPRate(skillName, b) - getXPRate(skillName, a));
            } else if (priorityType === priorityTypes.custom.id) {
                actions = PRIORITY_ARRAYS[skillName].filter(thisAction => thisAction.realm === game[skillName].currentRealm && !config[skillName].disabledActions[thisAction.id] && checkAction(skillName, thisAction));
            } else if (priorityType === priorityTypes.intensity.id) {
                actions = game[skillName].actions
                    .filter(thisAction => thisAction.realm === game[skillName].currentRealm && !config[skillName].disabledActions[thisAction.id] && checkAction(skillName, thisAction) && thisAction.intensityPercent < 100)
                    .sort((a, b) => b.intensityPercent - a.intensityPercent);
            } else if (priorityType === priorityTypes.intensityLow.id) {
                actions = game[skillName].actions
                    .filter(thisAction => thisAction.realm === game[skillName].currentRealm && !config[skillName].disabledActions[thisAction.id] && checkAction(skillName, thisAction) && thisAction.intensityPercent < 100)
                    .sort((a, b) => a.intensityPercent - b.intensityPercent);
            }

            if (skill.returnMultiple) {
                return actions;
            } else {
                return actions[0];
            }
        }

        function patchSkill(skillName) {
            let skill = SKILLS.filter(skill => skill.id === skillName)[0];

            if (config[skillName].enabled) {
                try {
                    actCheckCount += game[skillName].actionInterval;

                    if (skillName === 'woodcutting' && actCheckCount >= checkThresh) {
                        const treeArray = getBestAction(skill)
                        const treeCount = Math.min(game[skillName].treeCutLimit, treeArray.length)
                        let goodCount = 0;

                        for (let i = 0; i < treeCount; i++) {
                            if (game[skillName].activeTrees.has(treeArray[i])) {
                                goodCount++;
                            }
                        }

                        if (goodCount < treeCount) {
                            game[skillName].stop()
                            for (let i = 0; i < treeCount; i++) {
                                game[skillName].selectTree(treeArray[i]);
                            }
                        }

                        actCheckCount = 0;
                    } else if (skillName === 'fishing' && actCheckCount >= checkThresh) {
                        const bestAction = getBestAction(skill);

                        if (bestAction !== undefined && game[skillName].activeFish.id !== bestAction.id) {
                            game[skillName].onAreaFishSelection(bestAction.area, bestAction);
                            game[skillName].onAreaStartButtonClick(bestAction.area);
                        }

                        actCheckCount = 0;
                    } else if (skillName === 'firemaking' && (checkAction(skillName, game[skillName].activeRecipe) || actCheckCount >= checkThresh)) {
                        const bestAction = getBestAction(skill);

                        if (bestAction !== undefined && game[skillName].activeRecipe.id !== bestAction.id) {
                            game[skillName].selectLog(bestAction);
                            game[skillName].burnLog();
                        }

                        actCheckCount = 0;
                    } else if (skillName === 'cooking' && (checkAction(skillName, game[skillName].activeRecipe) || actCheckCount >= checkThresh)) {
                        const bestAction = getBestAction(skill);

                        if (bestAction !== undefined && game[skillName].activeRecipe.id !== bestAction.id) {
                            game[skillName].onRecipeSelectionClick(bestAction);
                            game[skillName].onActiveCookButtonClick(bestAction.category);
                        }

                        actCheckCount = 0;
                    } else if (skillName === 'mining' && (game[skillName].activeRock.currentHP === 0 || actCheckCount >= checkThresh)) {
                        const bestAction = getBestAction(skill);

                        if (bestAction !== undefined && game[skillName].activeRock.id !== bestAction.id) {
                            game[skillName].onRockClick(bestAction);
                        }

                        actCheckCount = 0;
                    } else if (skillName === 'thieving' && !game[skillName].isStunned && actCheckCount >= checkThresh) {
                        const bestAction = getBestAction(skill);

                        if (bestAction !== undefined && game[skillName].currentNPC.id !== bestAction.id) {
                            thievingMenu.selectNPC(bestAction, bestAction.area, game[skillName]);
                            game[skillName].startThieving(bestAction.area, bestAction);
                        }

                        actCheckCount = 0;
                    } else if (skillName === 'astrology' && actCheckCount >= checkThresh) {
                        const bestAction = getBestAction(skill);

                        if (bestAction !== undefined && game[skillName].activeConstellation.id !== bestAction.id) {
                            game[skillName].studyConstellationOnClick(bestAction);
                        }

                        actCheckCount = 0;
                    } else if (skillName === 'harvesting' && actCheckCount >= checkThresh) {
                        const bestAction = getBestAction(skill);

                        if (bestAction !== undefined && game[skillName].activeVein.id !== bestAction.id) {
                            game[skillName].onVeinClick(bestAction);
                        }

                        actCheckCount = 0;
                    } else if (!skill.hasOwnPatch && (checkAction(skillName, game[skillName].activeRecipe) || actCheckCount >= checkThresh)) {
                        const bestAction = getBestAction(skill);

                        if (bestAction !== undefined && game[skillName].activeRecipe.id !== bestAction.id) {
                            game[skillName].selectRecipeOnClick(bestAction);
                            game[skillName].createButtonOnClick();
                        }

                        actCheckCount = 0;
                    }
                } catch (err) {
                    console.log({msg: `${id} encountered an error`, exception: err})
                }
            }
        }

        //GUI
        const orderCustomPriorityMenu = (skillName) => {
            const priority = PRIORITY_ARRAYS[skillName];

            if (!priority.length) {
                return;
            }

            const menu = $(`#${id}-${skillName}-prioritysettings-custom`);
            const menuItems = [...menu.children()];

            function indexOfOrInf(el) {
                let i = priority.indexOf(el);
                return i === -1 ? Infinity : i;
            }

            const sortedMenu = menuItems.sort((a, b) => indexOfOrInf(getAction(skillName, $(a).data('action'))) - indexOfOrInf(getAction(skillName, $(b).data('action'))));

            menu.append(sortedMenu);
        };
        const orderMasteryPriorityMenu = (skillName) => {
            const menu = $(`#${id}-${skillName}-prioritysettings-mastery`);

            menu.children()
                .toArray()
                .filter((e) => getMasteryLevel(skillName, getAction(skillName, $(e).data('action'))) >= 99)
                .forEach((e) => $(e).remove());

            const sortedMenuItems = menu
                .children()
                .toArray()
                .sort((a, b) => getMasteryXP(skillName, getAction(skillName, $(b).data('action'))) - getMasteryXP(skillName, getAction(skillName, $(a).data('action'))));

            menu.append(sortedMenuItems);
        };
        const orderMasteryLowPriorityMenu = (skillName) => {
            const menu = $(`#${id}-${skillName}-prioritysettings-masteryLow`);

            menu.children()
                .toArray()
                .filter((e) => getMasteryLevel(skillName, getAction(skillName, $(e).data('action'))) >= 99)
                .forEach((e) => $(e).remove());

            const sortedMenuItems = menu
                .children()
                .toArray()
                .sort((a, b) => getMasteryXP(skillName, getAction(skillName, $(a).data('action'))) - getMasteryXP(skillName, getAction(skillName, $(b).data('action'))));

            menu.append(sortedMenuItems);
        };
        const orderQuantityPriorityMenu = (skillName) => {
            const menu = $(`#${id}-${skillName}-prioritysettings-lowestQuantity`);
            const sortedMenuItems = menu
                .children()
                .toArray()
                .sort((a, b) => bankQty(getProduct(skillName, getAction(skillName, $(a).data('action')))) - bankQty(getProduct(skillName, getAction(skillName, $(b).data('action')))));

            menu.append(sortedMenuItems);
        }
        const orderBestXPPriorityMenu = (skillName) => {
            const menu = $(`#${id}-${skillName}-prioritysettings-bestXP`);
            const sortedMenuItems = menu
                .children()
                .toArray()
                .sort((a, b) => getXPRate(skillName, getAction(skillName, $(b).data('action'))) - getXPRate(skillName, getAction(skillName, $(a).data('action'))));

            menu.append(sortedMenuItems);
        };
        const orderIntensityPriorityMenu = (skillName) => {
            const menu = $(`#${id}-${skillName}-prioritysettings-intensity`);

            menu.children()
                .toArray()
                .filter((e) => getAction(skillName, $(e).data('action')).intensityPercent >= 100)
                .forEach((e) => $(e).remove());

            const sortedMenuItems = menu
                .children()
                .toArray()
                .sort((a, b) => getAction(skillName, $(b).data('action')).intensityPercent - getAction(skillName, $(a).data('action')).intensityPercent);

            menu.append(sortedMenuItems);
        };
        const orderIntensityLowPriorityMenu = (skillName) => {
            const menu = $(`#${id}-${skillName}-prioritysettings-intensityLow`);

            menu.children()
                .toArray()
                .filter((e) => getAction(skillName, $(e).data('action')).intensityPercent >= 100)
                .forEach((e) => $(e).remove());

            const sortedMenuItems = menu
                .children()
                .toArray()
                .sort((a, b) => getAction(skillName, $(a).data('action')).intensityPercent - getAction(skillName, $(b).data('action')).intensityPercent);

            menu.append(sortedMenuItems);
        };

        const injectSkillGUI = (skill) => {
            const skillID = `${id}-${skill.id}`;
            const skillName = skill.id;
            const disabledOpacity = 0.25;

            $(`#${skillID}`).remove();

            function priorityTypeFilter(priorityType) {
                return  priorityType === priorityTypes.custom
                    || priorityType === priorityTypes.bestXP
                    || (priorityType === priorityTypes.lowestQuantity && skill.includeQuantity)
                    || (skill.hasMastery && !config[skillName].masteryDone && (priorityType === priorityTypes.mastery || priorityType === priorityTypes.masteryLow))
                    || (skill.hasIntensity && !config[skillName].intensityDone && (priorityType === priorityTypes.intensity || priorityType === priorityTypes.intensityLow));
            }
            function createActionDiv(action) {
                let product = getProduct(skillName, action);

                return `<div class="btn btn-outline-secondary ${skillID}-priority-selector" data-action="${action.id}" data-tippy-content="${action.name}" style="margin: 2px; padding: 6px; float: left;">
                                <img src="${product ? product.media : action.media}" width="30" height="30" />
                            </div>`;
            }
            function createPriorityTypeSelector(priorityType) {
                const prefix = `${skillID}-prioritytype`;
                const elementId = `${prefix}-${priorityType.id}`;

                return `<div class="custom-control custom-radio custom-control-inline" data-tippy-content="${priorityType.tooltip}">
                                <input class="custom-control-input" type="radio" id="${elementId}" name="${prefix}" value="${priorityType.id}"${config[skillName].priorityType === priorityType.id ? ' checked' : ''}>
                                <label class="custom-control-label" for="${elementId}">${priorityType.description}</label>
                            </div>`;
            }
            function createActionContainer(priorityType) {
                const prioritySettings = `${skillID}-prioritysettings`;
                const actionDivs = SKILL_ACTIONS[skillName].map(createActionDiv).join('');
                const resetButton = priorityType === priorityTypes.custom
                    ? `<button id="${prioritySettings}-reset" class="btn btn-primary locked" data-tippy-content="Reset order to default (highest to lowest level)" style="margin: 5px 0 0 2px; float: right;">Reset</button>`
                    : '';

                return `<div id="${prioritySettings}-${priorityType.id}" class="${skillID}-action-toggles">
                                ${actionDivs}
                                ${resetButton}
                            </div>`
            }
            function createSkillDiv() {
                return `<div id="${skillID}-inner" class="col-12">
                            <div class="block block-rounded block-link-pop border-top border-${skillName} border-4x" style="padding-bottom: 12px">
                                <div class="block-header border-bottom">
                                    <h3 class="block-title">Auto ${skill.name}</h3>
                                    <div class="custom-control custom-switch">
                                        <input type="checkbox" class="custom-control-input" id="${skillID}-enabled" name="${skillID}-enabled"${config[skillName].enabled ? ' checked' : ''}>
                                        <label class="custom-control-label" for="${skillID}-enabled">Enable</label>
                                    </div>
                                    <div class="custom-control custom-switch" style="margin-left:20px">
                                        <input type="checkbox" class="custom-control-input" id="${skillID}-collapsed" name="${skillID}-collapsed"${config[skillName].collapsed ? ' checked' : ''}>
                                        <label class="custom-control-label" for="${skillID}-collapsed">Collapse</label>
                                    </div>
                                    <div class="custom-control">
                                        <button class="btn btn-sm btn-danger" id="${skillID}-config-reset" data-tippy-content="Reset ${skill.id} settings to default<br><br><dl><dt>Priority type</dt><dd>- Custom priority</dd><dt>Custom priority order</dt><dd>- highest to lowest level</dd><dt>Disabled items</dt><dd>- all enabled</dd></dl>"><i class="fas fa-fw fa-cog"></i></button>
                                    </div>
                                </div>
                                <div class="block-content" style="padding-top: 12px">
                                    ${Object.values(priorityTypes).filter(priorityTypeFilter).map(createPriorityTypeSelector).join('')}
                                </div>
                                <div class="block-content" style="padding-top: 12px">
                                    ${Object.values(priorityTypes).filter(priorityTypeFilter).map(createActionContainer).join('')}
                                </div>
                            </div>
                        </div>`;
            }
            const autoSkillDiv = `<div id="${skillID}" class="row row-deck">${createSkillDiv()}</div>`;
            $(`#${skillName}-container div[class="skill-info"]`).after($(autoSkillDiv));

            function addStateChangeHandler() {
                $(`#${skillID}-enabled`).change((event) => {
                    config[skillName].enabled = event.currentTarget.checked;
                    storeConfig();
                });
            }
            addStateChangeHandler()

            function addCollapsedChangeHandler() {
                $(`#${skillID}-collapsed`).change((event) => {
                    let collapsed = event.currentTarget.checked

                    config[skillName].collapsed = collapsed;
                    storeConfig();

                    if (collapsed) {
                        $(`#${skillID} .block-content`).hide();
                    } else {
                        $(`#${skillID} .block-content`).show();
                    }
                });
            }
            addCollapsedChangeHandler()

            function showSelectedPriorityTypeSettings() {
                for (const priorityType of Object.values(priorityTypes)) {
                    $(`#${skillID}-prioritysettings-${priorityType.id}`).toggle(priorityType.id === config[skillName].priorityType);
                }
            }
            showSelectedPriorityTypeSettings();

            function addPriorityTypeChangeHandler() {
                $(`#${skillID} input[name="${skillID}-prioritytype"]`).change((event) => {
                    config[skillName].priorityType = event.currentTarget.value;
                    showSelectedPriorityTypeSettings();
                    storeConfig();
                });
            }
            addPriorityTypeChangeHandler();

            function makeSortable() {
                const elementId = `${skillID}-prioritysettings-custom`;

                Sortable.create(document.getElementById(elementId), {
                    animation: 150,
                    filter: '.locked',
                    onMove: (event) => {
                        if (event.related) {
                            return !event.related.classList.contains('locked');
                        }
                    },
                    onEnd: () => {
                        PRIORITY_ARRAYS[skillName] = [...$(`#${elementId} .${skillID}-priority-selector`)].map(
                            (x) => getAction(skillName, $(x).data('action'))
                        );
                        config[skillName].priority = priorityToConfig(skillName, PRIORITY_ARRAYS[skillName]);
                        storeConfig();
                    },
                });
            }
            makeSortable()

            function addPriorityResetClickHandler() {
                $(`#${skillID}-prioritysettings-reset`).on('click', () => {
                    PRIORITY_ARRAYS[skillName] = [...SKILL_ACTIONS[skillName]];
                    config[skillName].priority = priorityToConfig(skillName, PRIORITY_ARRAYS[skillName]);
                    orderCustomPriorityMenu(skillName);
                    storeConfig();
                });
            }
            addPriorityResetClickHandler();

            function addSkillConfigResetClickHandler() {
                $(`#${skillID}-config-reset`).on('click', () => {
                    PRIORITY_ARRAYS[skillName] = [...SKILL_ACTIONS[skillName]];
                    config[skillName].priority = priorityToConfig(skillName, PRIORITY_ARRAYS[skillName]);
                    config[skillName].priorityType = priorityTypes.custom.id;
                    config[skillName].disabledActions = {};
                    storeConfig();
                    orderCustomPriorityMenu(skillName);
                    $(`.${skillID}-action-toggles div`).each((_, e) => {
                        $(e).css('opacity', 1);
                    });
                    $(`#${skillID}-prioritytype-custom`).click()
                });
            }
            addSkillConfigResetClickHandler();

            $(`.${skillID}-action-toggles div`).each((_, e) => {
                const toggle = $(e);
                const actionID = toggle.data('action');

                if (config[skillName].disabledActions[actionID]) {
                    toggle.css('opacity', disabledOpacity);
                }
            });

            $(`.${skillID}-action-toggles div`).on('click', (event) => {
                const toggle = $(event.currentTarget);
                const actionID = toggle.data('action');

                if (config[skillName].disabledActions[actionID]) {
                    delete config[skillName].disabledActions[actionID];
                } else {
                    config[skillName].disabledActions[actionID] = true;
                }

                const opacity = config[skillName].disabledActions[actionID] ? disabledOpacity : 1;
                toggle.fadeTo(200, opacity);
                storeConfig();

                $(`.${skillID}-action-toggles div[data-action="${actionID}"]`).each((_, e) => {
                    $(e).css('opacity', opacity);
                })
            });

            orderCustomPriorityMenu(skillName);
            if (skill.hasMastery && !config[skillName].masteryDone) {
                orderMasteryPriorityMenu(skillName);
                orderMasteryLowPriorityMenu(skillName);
            }
            if (skill.hasIntensity && !config[skillName].intensityDone) {
                orderIntensityPriorityMenu(skillName);
                orderIntensityLowPriorityMenu(skillName);
            }
            if (skill.includeQuantity) {
                orderQuantityPriorityMenu(skillName);
            }
            orderBestXPPriorityMenu(skillName);

            tippy(`#${skillID} [data-tippy-content]`, {
                animation: false,
                allowHTML: true
            });

            if (config[skillName].collapsed) {
                $(`#${skillID} .block-content`).hide();
            }
        }

        const injectGUI = () => {
            SKILLS.forEach(skill => {
                injectSkillGUI(skill);
            })
        }

        //hooks
        ctx.onCharacterLoaded(() => {
            loadConfig();

            ctx.patch(Woodcutting, 'postAction').after(function(){ patchSkill('woodcutting') });
            ctx.patch(Fishing, 'postAction').after(function(){ patchSkill('fishing') });
            ctx.patch(Firemaking, 'postAction').after(function(){ patchSkill('firemaking') });
            ctx.patch(Cooking, 'postAction').after(function(){ patchSkill('cooking') });
            ctx.patch(Mining, 'postAction').after(function(){ patchSkill('mining') });
            ctx.patch(Smithing, 'postAction').after(function(){ patchSkill('smithing') });
            ctx.patch(Thieving, 'postAction').after(function(){ patchSkill('thieving') });
            ctx.patch(Fletching, 'postAction').after(function(){ patchSkill('fletching') });
            ctx.patch(Crafting, 'postAction').after(function(){ patchSkill('crafting') });
            ctx.patch(Runecrafting, 'postAction').after(function(){ patchSkill('runecrafting') });
            ctx.patch(Herblore, 'postAction').after(function(){ patchSkill('herblore') });
            ctx.patch(Astrology, 'postAction').after(function(){ patchSkill('astrology') });
            ctx.patch(Harvesting, 'postAction').after(function(){ patchSkill('harvesting') });

            console.log(`${title} patched!`);
        });

        ctx.onInterfaceReady(() => {
            injectGUI();

            console.log(`${title} loaded!`);
        });
    });
}