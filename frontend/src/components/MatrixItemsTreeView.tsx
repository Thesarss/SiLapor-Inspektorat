import { useState } from 'react';
import '../styles/MatrixItemsTreeView.css';

interface MatrixItem {
  id: string;
  item_number: number;
  temuan: string;
  penyebab: string;
  rekomendasi: string;
  tindak_lanjut?: string;
  evidence_filename?: string;
  evidence_count?: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
}

interface GroupedItem {
  temuan: string;
  penyebab: string;
  items: MatrixItem[];
  totalItems: number;
  completedItems: number;
}

interface MatrixItemsTreeViewProps {
  items: MatrixItem[];
  selectedItem: MatrixItem | null;
  onSelectItem: (item: MatrixItem) => void;
}

export function MatrixItemsTreeView({ items, selectedItem, onSelectItem }: MatrixItemsTreeViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group items by temuan
  const groupedItems: GroupedItem[] = items.reduce((acc, item) => {
    const existingGroup = acc.find(g => g.temuan === item.temuan && g.penyebab === item.penyebab);
    
    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.totalItems++;
      if (item.status !== 'pending') {
        existingGroup.completedItems++;
      }
    } else {
      acc.push({
        temuan: item.temuan,
        penyebab: item.penyebab,
        items: [item],
        totalItems: 1,
        completedItems: item.status !== 'pending' ? 1 : 0
      });
    }
    
    return acc;
  }, [] as GroupedItem[]);

  const toggleGroup = (temuan: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(temuan)) {
      newExpanded.delete(temuan);
    } else {
      newExpanded.add(temuan);
    }
    setExpandedGroups(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'submitted': return '📤';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      default: return '📋';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'submitted': return 'Submitted';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const getGroupStatus = (group: GroupedItem) => {
    if (group.completedItems === 0) return 'pending';
    if (group.completedItems === group.totalItems) return 'completed';
    return 'in-progress';
  };

  return (
    <div className="matrix-tree-view">
      <div className="tree-header">
        <h2>📋 Daftar Temuan</h2>
        <div className="tree-stats">
          <span className="stat-item">
            <strong>{groupedItems.length}</strong> Temuan
          </span>
          <span className="stat-item">
            <strong>{items.length}</strong> Rekomendasi
          </span>
        </div>
      </div>

      <div className="tree-content">
        {groupedItems.map((group, groupIndex) => {
          const groupKey = `${group.temuan}-${groupIndex}`;
          const isExpanded = expandedGroups.has(groupKey);
          const groupStatus = getGroupStatus(group);

          return (
            <div key={groupKey} className={`tree-group ${groupStatus}`}>
              <div 
                className="group-header"
                onClick={() => toggleGroup(groupKey)}
              >
                <div className="group-header-left">
                  <span className="expand-icon">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span className="group-number">#{groupIndex + 1}</span>
                  <span className="group-title">{group.temuan.substring(0, 80)}...</span>
                </div>
                <div className="group-header-right">
                  <span className="group-progress">
                    {group.completedItems}/{group.totalItems}
                  </span>
                  <span className={`group-status-badge ${groupStatus}`}>
                    {groupStatus === 'pending' && '⏳ Belum'}
                    {groupStatus === 'in-progress' && '🔄 Progress'}
                    {groupStatus === 'completed' && '✅ Selesai'}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="group-content">
                  <div className="group-details">
                    <div className="detail-row">
                      <strong>🔍 Temuan:</strong>
                      <p>{group.temuan}</p>
                    </div>
                    {group.penyebab && (
                      <div className="detail-row">
                        <strong>❓ Penyebab:</strong>
                        <p>{group.penyebab}</p>
                      </div>
                    )}
                  </div>

                  <div className="recommendations-list">
                    <h4>💡 Rekomendasi ({group.items.length}):</h4>
                    {group.items.map((item, itemIndex) => (
                      <div
                        key={item.id}
                        className={`recommendation-item ${selectedItem?.id === item.id ? 'selected' : ''} ${item.status}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(item);
                        }}
                      >
                        <div className="rec-header">
                          <span className="rec-number">
                            {group.items.length > 1 ? `${groupIndex + 1}.${itemIndex + 1}` : `${groupIndex + 1}`}
                          </span>
                          <span className={`rec-status ${item.status}`}>
                            {getStatusIcon(item.status)} {getStatusText(item.status)}
                          </span>
                        </div>
                        <p className="rec-text">{item.rekomendasi}</p>
                        {item.evidence_count && item.evidence_count > 0 && (
                          <div className="rec-evidence">
                            📎 {item.evidence_count} file evidence
                          </div>
                        )}
                        {item.tindak_lanjut && (
                          <div className="rec-tindak-lanjut">
                            <strong>Tindak Lanjut:</strong>
                            <p>{item.tindak_lanjut.substring(0, 100)}...</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
