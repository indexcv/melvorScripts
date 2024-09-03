export function setup(ctx) {
    ctx.onCharacterSelectionLoaded(ctx => {
        const id = "banker"
        const title = "Bank reset button"


        const injectGUI = () => {
            // main-bank-options
            const resetButton = `<div class="p-3"></div>`
            $('.placeholder-search-bank').parent().parent().after($(resetButton));

            function addFullResetHandler() {
                $(`${id}-button-full-reset`).on('click', () => {
                    resetDefaultItemTabs();
                    resetLockedItems();
                    resetTabIcons();
                    moveAllBankItemsToFirstTab();
                });
            }
            addFullResetHandler()

            function addSelectedResetHandler() {
                $(`${id}-button-selected-reset`).on('click', () => {
                    resetDefaultItemTabs();
                    resetLockedItems();
                    resetTabIcons();
                    moveAllBankItemsToFirstTab();
                });
            }
            addSelectedResetHandler()

            function resetLockedItems() {
                game.bank.lockedItems = new Set();
            }
            function resetDefaultItemTabs() {
                game.bank.defaultItemTabs = new Map();
            }
            function resetTabIcons() {
                game.bank.tabIcons = new Map();
            }
            function moveAllBankItemsToFirstTab() {
                game.bank.itemSelectionMode = 1;
                game.bank.items.forEach(item => {
                    game.bank.toggleItemSelected(item);
                });
                game.bank.moveSelectedItemsToTab(0);
                game.bank.itemSelectionMode = 0;
            }
        };

        //hooks
        ctx.onInterfaceReady(() => {
            injectGUI();

            console.log(`${id}-${title} loaded!`);
        });
    });
}