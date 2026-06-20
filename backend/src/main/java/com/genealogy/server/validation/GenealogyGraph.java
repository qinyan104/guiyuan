package com.genealogy.server.validation;

import com.genealogy.server.types.FamilyUnit;
import com.genealogy.server.types.Person;
import com.genealogy.server.types.PublicationData;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 族谱关系图 — 内存中的结构，供校验规则高效查询
 *
 * 从 PublicationData 构建，提供以下查询能力：
 * - 父母/子女/配偶/兄弟关系
 * - 世代号（从始祖开始的世代层数）
 * - 连通分量（孤立分支检测）
 * - 所有人物/家庭的遍历
 */
public class GenealogyGraph {

    private final Map<String, Person> persons;
    private final Map<String, FamilyUnit> families;

    // personId → [childId, ...]
    private final Map<String, List<String>> parentToChildren = new HashMap<>();
    // childId → [parentId, ...]
    private final Map<String, List<String>> childToParents = new HashMap<>();
    // personId → [spouseId, ...]
    private final Map<String, List<String>> spouseMap = new HashMap<>();
    // personId → generation number (0 = root, 1 = child, ...)
    private final Map<String, Integer> generationMap = new HashMap<>();

    private GenealogyGraph(Map<String, Person> persons, Map<String, FamilyUnit> families) {
        this.persons = persons;
        this.families = families;
        buildRelationships();
        computeGenerations();
    }

    /**
     * 从 PublicationData 构建关系图
     */
    public static GenealogyGraph from(PublicationData data) {
        return new GenealogyGraph(
            Collections.unmodifiableMap(data.people()),
            Collections.unmodifiableMap(data.families())
        );
    }

    // ─── Relationship Queries ────────────────────────────────────

    public Person getPerson(String personId) {
        return persons.get(personId);
    }

    public Collection<Person> getAllPersons() {
        return persons.values();
    }

    public Collection<FamilyUnit> getAllFamilies() {
        return families.values();
    }

    public FamilyUnit getFamily(String familyId) {
        return families.get(familyId);
    }

    /** 获取 personId 的所有子女 */
    public List<Person> getChildren(String personId) {
        return parentToChildren.getOrDefault(personId, List.of()).stream()
            .map(persons::get)
            .filter(Objects::nonNull)
            .toList();
    }

    /** 获取 personId 的所有父母 */
    public List<Person> getParents(String personId) {
        return childToParents.getOrDefault(personId, List.of()).stream()
            .map(persons::get)
            .filter(Objects::nonNull)
            .toList();
    }

    /** 获取 personId 的所有配偶（同一家庭的另一个 adult） */
    public List<Person> getSpouses(String personId) {
        return spouseMap.getOrDefault(personId, List.of()).stream()
            .map(persons::get)
            .filter(Objects::nonNull)
            .toList();
    }

    /** 获取 personId 的所有兄弟姐妹（同一家庭的其他 children） */
    public List<Person> getSiblings(String personId) {
        Set<String> siblingIds = new LinkedHashSet<>();
        for (String parentId : childToParents.getOrDefault(personId, List.of())) {
            for (String childId : parentToChildren.getOrDefault(parentId, List.of())) {
                if (!childId.equals(personId)) {
                    siblingIds.add(childId);
                }
            }
        }
        return siblingIds.stream()
            .map(persons::get)
            .filter(Objects::nonNull)
            .toList();
    }

    /** 获取 personId 的世代号（从始祖开始的层数，0 = 没有父母的人物） */
    public int getGeneration(String personId) {
        return generationMap.getOrDefault(personId, 0);
    }

    /** 获取族谱中的最大世代数 */
    public int getMaxGeneration() {
        return generationMap.values().stream().mapToInt(Integer::intValue).max().orElse(0);
    }

    /**
     * 获取所有连通分量（用于孤立分支检测）
     * 每个连通分量是一组通过家庭关系相连的人物 ID
     */
    public List<Set<String>> getConnectedComponents() {
        Set<String> visited = new HashSet<>();
        List<Set<String>> components = new ArrayList<>();

        // 构建无向邻接表
        Map<String, Set<String>> adjacency = new HashMap<>();
        for (String pid : persons.keySet()) {
            adjacency.computeIfAbsent(pid, k -> new HashSet<>());
        }
        for (FamilyUnit fam : families.values()) {
            Set<String> allMembers = new LinkedHashSet<>();
            allMembers.addAll(fam.adults());
            allMembers.addAll(fam.children());
            for (String a : allMembers) {
                for (String b : allMembers) {
                    if (!a.equals(b)) {
                        adjacency.computeIfAbsent(a, k -> new HashSet<>()).add(b);
                        adjacency.computeIfAbsent(b, k -> new HashSet<>()).add(a);
                    }
                }
            }
        }

        // BFS 遍历
        for (String start : persons.keySet()) {
            if (visited.contains(start)) continue;
            Set<String> component = new LinkedHashSet<>();
            Queue<String> queue = new ArrayDeque<>();
            queue.add(start);
            visited.add(start);
            while (!queue.isEmpty()) {
                String current = queue.poll();
                component.add(current);
                for (String neighbor : adjacency.getOrDefault(current, Set.of())) {
                    if (visited.add(neighbor)) {
                        queue.add(neighbor);
                    }
                }
            }
            components.add(component);
        }
        return components;
    }

    /** 获取所有有父母的人物 */
    public Set<String> getChildrenIds() {
        return childToParents.keySet();
    }

    // ─── Internal ────────────────────────────────────────────────

    private void buildRelationships() {
        for (FamilyUnit fam : families.values()) {
            List<String> adults = fam.adults();
            List<String> children = fam.children();

            // parent → children
            for (String adultId : adults) {
                parentToChildren.computeIfAbsent(adultId, k -> new ArrayList<>()).addAll(children);
            }

            // child → parents
            for (String childId : children) {
                childToParents.computeIfAbsent(childId, k -> new ArrayList<>()).addAll(adults);
            }

            // spouses（同一家庭的成年人互为配偶）
            for (int i = 0; i < adults.size(); i++) {
                for (int j = i + 1; j < adults.size(); j++) {
                    spouseMap.computeIfAbsent(adults.get(i), k -> new ArrayList<>()).add(adults.get(j));
                    spouseMap.computeIfAbsent(adults.get(j), k -> new ArrayList<>()).add(adults.get(i));
                }
            }
        }
    }

    /**
     * BFS 计算世代号
     * 从没有父母的人物开始（世代 0），每向下一层世代 +1
     */
    private void computeGenerations() {
        // 找出所有根节点（没有父母的人物）
        Set<String> allPersonIds = persons.keySet();
        Set<String> hasParent = childToParents.keySet();

        Queue<String> queue = new ArrayDeque<>();
        for (String pid : allPersonIds) {
            if (!hasParent.contains(pid)) {
                generationMap.put(pid, 0);
                queue.add(pid);
            }
        }

        // 如果所有人物都有父母（循环引用？），给第一个未标记的分配世代 0
        if (queue.isEmpty() && !allPersonIds.isEmpty()) {
            String first = allPersonIds.iterator().next();
            generationMap.put(first, 0);
            queue.add(first);
        }

        // BFS
        while (!queue.isEmpty()) {
            String current = queue.poll();
            int currentGen = generationMap.get(current);

            for (String childId : parentToChildren.getOrDefault(current, List.of())) {
                if (!generationMap.containsKey(childId)) {
                    generationMap.put(childId, currentGen + 1);
                    queue.add(childId);
                }
            }
        }

        // 给任何仍未标记的人物分配世代 0（孤儿人物）
        for (String pid : allPersonIds) {
            generationMap.putIfAbsent(pid, 0);
        }
    }
}
