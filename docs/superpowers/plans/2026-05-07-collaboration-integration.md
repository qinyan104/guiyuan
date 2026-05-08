# Distributed Collaboration & Branch Merging Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore and complete the physical merging engine and UI components to allow genealogy owners to mount sub-branches and permanently merge them into the master publication.

**Architecture:** 
- **Backend:** `PublicationService.mergeBranch` performs a deep recursive clone of people, families, and photos from a target publication into the master publication, with ID remapping to prevent collisions.
- **Frontend:** `BranchMountManager.vue` provides the management UI for portaling and merging.

**Tech Stack:** Spring Boot 3, Vue 3, TypeScript.

---

### Task 1: Backend Merge Engine Implementation

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/service/PublicationService.java`
- Create: `backend/src/test/java/com/genealogy/server/service/BranchMergeTest.java`

- [ ] **Step 1: Add mergeBranch method to PublicationService**

```java
@Transactional
public void mergeBranch(Long masterPubId, String mountPointPersonId) {
    Person mountPoint = personRepository.findByPublicationIdAndPersonId(masterPubId, mountPointPersonId)
            .orElseThrow(() -> new NotFoundException("挂载点人物不存在"));
    
    if (!Boolean.TRUE.equals(mountPoint.getIsMountPoint()) || mountPoint.getTargetPublicationId() == null) {
        throw new BadRequestException("该人物不是有效的挂载点");
    }

    Long targetPubId = mountPoint.getTargetPublicationId();
    String idPrefix = "merged_" + targetPubId + "_";

    // 1. Recursive People Cloning
    List<Person> targetPeople = personRepository.findByPublicationId(targetPubId);
    Map<String, String> personIdMapping = new HashMap<>();
    
    for (Person tp : targetPeople) {
        String newPersonId = idPrefix + tp.getPersonId();
        personIdMapping.put(tp.getPersonId(), newPersonId);
        
        Person np = new Person();
        np.setPublicationId(masterPubId);
        np.setPersonId(newPersonId);
        np.setName(tp.getName());
        np.setGender(tp.getGender());
        np.setBirth(tp.getBirth());
        np.setDeath(tp.getDeath());
        np.setDeceased(tp.getDeceased());
        np.setAge(tp.getAge());
        np.setTitleName(tp.getTitleName());
        np.setClan(tp.getClan());
        np.setNote(tp.getNote());
        np.setHighlightRole(tp.getHighlightRole());
        
        // Handle Photo Cloning
        if (tp.getPhotoId() != null) {
            Photo sourcePhoto = photoRepository.findById(tp.getPhotoId()).orElse(null);
            if (sourcePhoto != null) {
                Photo newPhoto = new Photo();
                newPhoto.setMimeType(sourcePhoto.getMimeType());
                newPhoto.setData(Arrays.copyOf(sourcePhoto.getData(), sourcePhoto.getData().length));
                newPhoto = photoRepository.save(newPhoto);
                np.setPhotoId(newPhoto.getId());
            }
        }
        personRepository.save(np);
    }

    // 2. Family Cloning
    List<Family> targetFamilies = familyRepository.findByPublicationId(targetPubId);
    for (Family tf : targetFamilies) {
        Family nf = new Family();
        nf.setPublicationId(masterPubId);
        nf.setFamilyId(idPrefix + tf.getFamilyId());
        nf.setBranchMode(tf.getBranchMode());
        nf = familyRepository.save(nf);

        List<FamilyMember> members = familyMemberRepository.findByFamilyDbIdOrderBySortOrder(tf.getId());
        for (FamilyMember tm : members) {
            Person targetPerson = personRepository.findById(tm.getPersonDbId()).orElse(null);
            if (targetPerson != null) {
                String newPersonId = personIdMapping.get(targetPerson.getPersonId());
                Person masterPerson = personRepository.findByPublicationIdAndPersonId(masterPubId, newPersonId).orElse(null);
                if (masterPerson != null) {
                    FamilyMember nm = new FamilyMember();
                    nm.setFamilyDbId(nf.getId());
                    nm.setPersonDbId(masterPerson.getId());
                    nm.setRole(tm.getRole());
                    nm.setSortOrder(tm.getSortOrder());
                    familyMemberRepository.save(nm);
                }
            }
        }
    }

    // 3. Cleanup Mount Point
    mountPoint.setIsMountPoint(false);
    mountPoint.setTargetPublicationId(null);
    mountPoint.setTargetRootPersonId(null);
    personRepository.save(mountPoint);
    
    log.info("Physical merge completed: {} -> {}", targetPubId, masterPubId);
}
```

- [ ] **Step 2: Create unit test BranchMergeTest**
- [ ] **Step 3: Run tests and verify**
- [ ] **Step 4: Commit**

---

### Task 2: API Integration

**Files:**
- Modify: `backend/src/main/java/com/genealogy/server/controller/PublicationAccessController.java`
- Modify: `frontend/src/api/accessManage.ts`

- [ ] **Step 1: Add merge endpoint to controller**

```java
@PostMapping("/{personId}/merge")
public Map<String, Object> mergeBranch(@PathVariable Long id, @PathVariable String personId, HttpServletRequest request) {
    authorizationService.require(getSubject(request), id, AccessPermission.MANAGE_ACCESS);
    publicationService.mergeBranch(id, personId);
    return Map.of("success", true);
}
```

- [ ] **Step 2: Add frontend API call**

```typescript
export async function mergeBranch(publicationId: number, personId: string): Promise<void> {
  await http.post(`/publications/${publicationId}/access/${personId}/merge`)
}
```

- [ ] **Step 3: Commit**

---

### Task 3: BranchMountManager UI Component

**Files:**
- Create: `frontend/src/components/BranchMountManager.vue`

- [ ] **Step 1: Create the component with features:**
  - Toggle `isMountPoint` status.
  - Select target publication from user's owned publications.
  - Trigger physical merge.
  - Show mount point metadata.

- [ ] **Step 2: Commit**

---

### Task 4: UI Integration & Visual Refinement

**Files:**
- Modify: `frontend/src/components/PersonEditorDrawer.vue`
- Modify: `frontend/src/components/PersonCardSvg.vue`

- [ ] **Step 1: Inject BranchMountManager into PersonEditorDrawer**
- [ ] **Step 2: Ensure PersonCardSvg correctly displays the portal icon**
- [ ] **Step 3: Commit**
