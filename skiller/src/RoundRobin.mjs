export class RoundRobinManager {
    constructor() {
        this.state = {}; // skill → current index
    }

    next(skill, allItems, availableItems) {
        if (!allItems?.length || !availableItems?.length) return undefined;

        if (!this.state[skill]) {
            this.state[skill] = { index: -1 };
        }

        const skillState = this.state[skill];
        const len = allItems.length;

        // Fast availability lookup
        const availableSet = new Set(availableItems.map(i => i.id));

        let checked = 0;

        while (checked < len) {
            skillState.index = (skillState.index + 1) % len;
            const candidate = allItems[skillState.index];

            if (availableSet.has(candidate.id)) {
                return candidate;
            }

            checked++;
        }

        // No available items found
        return undefined;
    }
}
