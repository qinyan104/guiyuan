package com.genealogy.server.dto;

import java.util.List;

public class DraftSyncStatusResponse {

    private Long draftId;
    private Long currentRevision;
    private Long snapshotRevision;
    private boolean hasPendingSync;
    private List<SyncEntry> changes;

    public Long getDraftId() { return draftId; }
    public void setDraftId(Long draftId) { this.draftId = draftId; }
    public Long getCurrentRevision() { return currentRevision; }
    public void setCurrentRevision(Long currentRevision) { this.currentRevision = currentRevision; }
    public Long getSnapshotRevision() { return snapshotRevision; }
    public void setSnapshotRevision(Long snapshotRevision) { this.snapshotRevision = snapshotRevision; }
    public boolean isHasPendingSync() { return hasPendingSync; }
    public void setHasPendingSync(boolean hasPendingSync) { this.hasPendingSync = hasPendingSync; }
    public List<SyncEntry> getChanges() { return changes; }
    public void setChanges(List<SyncEntry> changes) { this.changes = changes; }

    public static class SyncEntry {
        private String personId;
        private String personName;
        private String changeType;
        private boolean acknowledged;

        public String getPersonId() { return personId; }
        public void setPersonId(String personId) { this.personId = personId; }
        public String getPersonName() { return personName; }
        public void setPersonName(String personName) { this.personName = personName; }
        public String getChangeType() { return changeType; }
        public void setChangeType(String changeType) { this.changeType = changeType; }
        public boolean isAcknowledged() { return acknowledged; }
        public void setAcknowledged(boolean acknowledged) { this.acknowledged = acknowledged; }
    }
}
