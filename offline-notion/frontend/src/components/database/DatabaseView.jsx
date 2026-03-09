import React, { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, MoreHorizontal, ChevronDown, Tag, Calendar, Type, Hash, CheckSquare } from 'lucide-react';
import { databasesApi } from '../../utils/api';
import { format } from 'date-fns';

const PROPERTY_TYPES = [
  { value: 'text', label: 'Text', icon: <Type size={12} /> },
  { value: 'number', label: 'Number', icon: <Hash size={12} /> },
  { value: 'date', label: 'Date', icon: <Calendar size={12} /> },
  { value: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={12} /> },
  { value: 'tag', label: 'Tag', icon: <Tag size={12} /> },
];

function TagCell({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const tags = options?.tags || [];
  const currentTags = value ? value.split(',').filter(Boolean) : [];

  const toggleTag = (tag) => {
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    onChange(newTags.join(','));
    setOpen(false);
  };

  const tagColors = {
    'Todo': 'bg-gray-500/20 text-gray-300',
    'In Progress': 'bg-blue-500/20 text-blue-300',
    'Done': 'bg-green-500/20 text-green-300',
    'default': 'bg-purple-500/20 text-purple-300',
  };

  return (
    <div className="relative px-2 py-1 flex flex-wrap gap-1 cursor-pointer" onClick={() => setOpen(v => !v)}>
      {currentTags.map(tag => (
        <span key={tag} className={`text-xs px-1.5 py-0.5 rounded-full ${tagColors[tag] || tagColors.default}`}>
          {tag}
        </span>
      ))}
      {currentTags.length === 0 && <span className="text-notion-muted text-xs">Select...</span>}

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-[#1e1e1e] border border-notion-border rounded-lg shadow-xl z-50 min-w-36 py-1">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={(e) => { e.stopPropagation(); toggleTag(tag); }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs w-full text-left hover:bg-notion-hover ${
                currentTags.includes(tag) ? 'text-notion-text' : 'text-notion-muted'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${currentTags.includes(tag) ? 'bg-notion-blue' : 'bg-notion-border'}`} />
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CellEditor({ type, value, options, onSave }) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');

  const handleBlur = () => {
    setEditing(false);
    if (localValue !== value) onSave(localValue);
  };

  if (type === 'checkbox') {
    const checked = value === 'true' || value === true;
    return (
      <div className="flex items-center justify-center h-full">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onSave(e.target.checked ? 'true' : 'false')}
          className="w-4 h-4 accent-notion-blue cursor-pointer"
        />
      </div>
    );
  }

  if (type === 'tag') {
    return <TagCell value={value} options={options} onChange={onSave} />;
  }

  if (type === 'date') {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onSave(e.target.value)}
        className="db-cell-input"
        style={{ colorScheme: 'dark' }}
      />
    );
  }

  return (
    <input
      type={type === 'number' ? 'number' : 'text'}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => { if (e.key === 'Enter') handleBlur(); }}
      className="db-cell-input"
      placeholder={type === 'number' ? '0' : ''}
    />
  );
}

export default function DatabaseView({ database, onUpdate }) {
  const [db, setDb] = useState(database);
  const [editingHeader, setEditingHeader] = useState(null);
  const [showAddProp, setShowAddProp] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropType, setNewPropType] = useState('text');

  const updateDb = (newDb) => {
    setDb(newDb);
    onUpdate?.(newDb);
  };

  const handleCellChange = async (rowId, propId, value) => {
    await databasesApi.updateCell(db.id, rowId, propId, value);
    updateDb({
      ...db,
      rows: db.rows.map(row =>
        row.id === rowId
          ? { ...row, cells: { ...row.cells, [propId]: value } }
          : row
      )
    });
  };

  const handleAddRow = async () => {
    const newRow = await databasesApi.addRow(db.id);
    updateDb({ ...db, rows: [...db.rows, newRow] });
  };

  const handleDeleteRow = async (rowId) => {
    await databasesApi.deleteRow(db.id, rowId);
    updateDb({ ...db, rows: db.rows.filter(r => r.id !== rowId) });
  };

  const handleAddProperty = async () => {
    if (!newPropName.trim()) return;
    const prop = await databasesApi.addProperty(db.id, {
      name: newPropName,
      type: newPropType,
      options: newPropType === 'tag' ? { tags: ['Option 1', 'Option 2', 'Option 3'] } : {},
    });
    updateDb({
      ...db,
      properties: [...db.properties, prop],
      rows: db.rows.map(row => ({ ...row, cells: { ...row.cells, [prop.id]: '' } }))
    });
    setNewPropName('');
    setShowAddProp(false);
  };

  const handleUpdatePropertyName = async (propId, name) => {
    await databasesApi.updateProperty(db.id, propId, { name });
    updateDb({
      ...db,
      properties: db.properties.map(p => p.id === propId ? { ...p, name } : p)
    });
    setEditingHeader(null);
  };

  const handleDeleteProperty = async (propId) => {
    await databasesApi.deleteProperty(db.id, propId);
    updateDb({
      ...db,
      properties: db.properties.filter(p => p.id !== propId),
      rows: db.rows.map(row => {
        const cells = { ...row.cells };
        delete cells[propId];
        return { ...row, cells };
      })
    });
  };

  const handleTitleChange = async (title) => {
    await databasesApi.update(db.id, { title });
    updateDb({ ...db, title });
  };

  const getTypeIcon = (type) => {
    const found = PROPERTY_TYPES.find(t => t.value === type);
    return found?.icon || <Type size={12} />;
  };

  return (
    <div className="rounded-lg border border-notion-border overflow-hidden">
      {/* Database header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-notion-border bg-[#161616]">
        <input
          value={db.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="bg-transparent text-sm font-semibold text-notion-text outline-none"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddRow}
            className="btn-ghost text-xs"
          >
            <Plus size={13} /> Add row
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="db-table">
          <thead>
            <tr>
              <th className="w-10 border-r border-notion-border">
                <div className="flex items-center justify-center text-notion-muted">
                  <span className="text-xs">#</span>
                </div>
              </th>
              {db.properties.map(prop => (
                <th key={prop.id} className="border-r border-notion-border min-w-32">
                  <div className="flex items-center justify-between px-3 py-2 group">
                    {editingHeader === prop.id ? (
                      <input
                        autoFocus
                        className="bg-notion-hover text-notion-text text-xs outline-none rounded px-1 flex-1"
                        defaultValue={prop.name}
                        onBlur={(e) => handleUpdatePropertyName(prop.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdatePropertyName(prop.id, e.target.value);
                          if (e.key === 'Escape') setEditingHeader(null);
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => setEditingHeader(prop.id)}
                        className="flex items-center gap-1.5 text-xs text-notion-muted hover:text-notion-text"
                      >
                        {getTypeIcon(prop.type)}
                        <span>{prop.name}</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteProperty(prop.id)}
                      className="p-0.5 rounded hover:bg-red-500/20 text-notion-muted hover:text-red-400 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-10">
                <button
                  onClick={() => setShowAddProp(v => !v)}
                  className="flex items-center justify-center w-full h-full text-notion-muted hover:text-notion-text p-2"
                  title="Add property"
                >
                  <Plus size={13} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {db.rows.map((row, rowIdx) => (
              <tr key={row.id} className="group hover:bg-notion-hover/20">
                <td className="border-r border-notion-border">
                  <div className="flex items-center justify-center gap-1 px-2">
                    <span className="text-xs text-notion-muted">{rowIdx + 1}</span>
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="p-0.5 rounded hover:bg-red-500/20 text-notion-muted hover:text-red-400 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </td>
                {db.properties.map(prop => {
                  const options = prop.options ? JSON.parse(typeof prop.options === 'string' ? prop.options : JSON.stringify(prop.options)) : {};
                  return (
                    <td key={prop.id} className="border-r border-notion-border">
                      <CellEditor
                        type={prop.type}
                        value={row.cells[prop.id] || ''}
                        options={options}
                        onSave={(value) => handleCellChange(row.id, prop.id, value)}
                      />
                    </td>
                  );
                })}
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row button */}
      <div className="border-t border-notion-border">
        <button
          onClick={handleAddRow}
          className="flex items-center gap-2 px-4 py-2 text-sm text-notion-muted hover:text-notion-text hover:bg-notion-hover/30 w-full transition-colors"
        >
          <Plus size={14} /> New row
        </button>
      </div>

      {/* Add property panel */}
      {showAddProp && (
        <div className="border-t border-notion-border p-4 bg-[#161616] animate-slide-in">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="input flex-1"
              placeholder="Property name"
              value={newPropName}
              onChange={e => setNewPropName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddProperty(); }}
            />
            <select
              value={newPropType}
              onChange={e => setNewPropType(e.target.value)}
              className="input"
            >
              {PROPERTY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button onClick={handleAddProperty} className="btn-primary">Add</button>
            <button onClick={() => setShowAddProp(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
