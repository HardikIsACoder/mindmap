// Helper to flatten the nested tree structure for easier rendering and lookup
export const flattenTree = (node, depth = 0, parentId = null) => {
    if (!node) return [];

    const flatNode = {
        ...node,
        depth,
        parentId,
        hasChildren: node.children && node.children.length > 0
    };

    let result = [flatNode];

    if (node.children) {
        node.children.forEach(child => {
            // Recursively flatten children
            result = [...result, ...flattenTree(child, depth + 1, node.id)];
        });
    }

    return result;
};

// Find all descendant IDs for a given node (used for collapsing)
export const getDescendantIds = (nodeId, flatNodes) => {
    let descendants = [];

    // Find direct children
    const children = flatNodes.filter(n => n.parentId === nodeId);

    children.forEach(child => {
        descendants.push(child.id);
        // Recursively get their children
        descendants = [...descendants, ...getDescendantIds(child.id, flatNodes)];
    });

    return descendants;
};

// Find all ancestor IDs (used for breadcrumbs)
export const getAncestorIds = (nodeId, flatNodes) => {
    const ancestors = [];
    let current = flatNodes.find(n => n.id === nodeId);

    while (current && current.parentId) {
        ancestors.push(current.parentId);
        current = flatNodes.find(n => n.id === current.parentId);
    }

    return ancestors;
};

// Updates a node within the deep tree structure
export const updateNodeInTree = (tree, nodeId, updates) => {
    if (tree.id === nodeId) {
        return { ...tree, ...updates };
    }

    if (tree.children) {
        return {
            ...tree,
            children: tree.children.map(child => updateNodeInTree(child, nodeId, updates))
        };
    }

    return tree;
};

// Adds a node to the deep tree structure
export const addNodeToTree = (tree, parentId, newNode) => {
    if (tree.id === parentId) {
        return {
            ...tree,
            children: [...(tree.children || []), newNode]
        };
    }

    if (tree.children) {
        return {
            ...tree,
            children: tree.children.map(child => addNodeToTree(child, parentId, newNode))
        };
    }

    return tree;
};

// Removes a node from the deep tree structure
export const removeNodeFromTree = (tree, nodeId) => {
    if (!tree.children) return tree;

    return {
        ...tree,
        children: tree.children
            .filter(child => child.id !== nodeId)
            .map(child => removeNodeFromTree(child, nodeId))
    };
};
