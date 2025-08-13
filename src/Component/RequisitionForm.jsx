import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

const RequisitionForm = ({ inventory, setNotification }) => {
  const [selectedItems, setSelectedItems] = useState([]); // [{id, quantity}]
  const [department, setDepartment] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [isItItem, setIsItItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uniqueCode, setUniqueCode] = useState(""); // Store the unique code
  const token = localStorage.getItem("token");

  // Fetch departments on component mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch("http://localhost:5000/departments", {
        headers: { Authorization: "Bearer " + token }
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      } else {
        console.error("Failed to fetch departments");
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const handleCheckboxChange = (itemId) => {
    setSelectedItems((prev) => {
      if (prev.some((i) => i.id === itemId)) {
        return prev.filter((i) => i.id !== itemId);
      } else {
        return [...prev, { id: itemId, quantity: 1 }];
      }
    });
  };

  const handleQuantityChange = (itemId, quantity) => {
    setSelectedItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, quantity: parseInt(quantity) || 1 } : i
      )
    );
  };

  const handleDepartmentChange = (e) => {
    const selectedDeptId = e.target.value;
    setDepartmentId(selectedDeptId);
    const selectedDept = departments.find(dept => dept.id.toString() === selectedDeptId);
    setDepartment(selectedDept ? selectedDept.name : "");
  };

  // Filter inventory based on search term
  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      if (setNotification) {
        setNotification("Please select at least one item.");
        setTimeout(() => setNotification(""), 3000);
      }
      return;
    }
    if (!departmentId) {
      if (setNotification) {
        setNotification("Please select a department.");
        setTimeout(() => setNotification(""), 3000);
      }
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5000/requisitions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({
          items: selectedItems,
          department_id: parseInt(departmentId),
          is_it_item: isItItem
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (setNotification) {
          setNotification(`Requisition submitted! Your pickup code: ${data.unique_code}`);
          setTimeout(() => setNotification(""), 3000);
        }
        setUniqueCode(data.unique_code); // Store the unique code
        setSelectedItems([]);
        setDepartment("");
        setDepartmentId("");
        setIsItItem(false);
        setSearchTerm("");
      } else {
        if (setNotification) {
          setNotification(data.error || "Failed to submit requisition.");
          setTimeout(() => setNotification(""), 3000);
        }
      }
    } catch (err) {
      if (setNotification) {
        setNotification("Server error.");
        setTimeout(() => setNotification(""), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Display unique code prominently if available */}
      {uniqueCode && (
        <div style={{ 
          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', 
          color: 'white', 
          padding: '20px', 
          borderRadius: '12px', 
          marginBottom: '24px', 
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>✅ Requisition Submitted Successfully!</h3>
          <div style={{ fontSize: '16px', marginBottom: '16px' }}>
            Your pickup code: <strong style={{ fontSize: '20px', letterSpacing: '2px' }}>{uniqueCode}</strong>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(uniqueCode);
              if (setNotification) {
                setNotification('Code copied to clipboard!');
                setTimeout(() => setNotification(''), 2000);
              }
            }}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            📋 Copy Code
          </button>
          <button 
            onClick={() => setUniqueCode('')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              marginLeft: '12px'
            }}
          >
            ✕ Clear
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600 }}>Department:</label>
          <select
            value={departmentId}
            onChange={handleDepartmentChange}
            required
            style={{ 
              marginLeft: 10, 
              padding: 8, 
              borderRadius: 4, 
              border: '1px solid #ccc',
              minWidth: 200,
              backgroundColor: 'white'
            }}
          >
            <option value="">Select a department</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600 }}>Is IT Item?</label>
          <input
            type="checkbox"
            checked={isItItem}
            onChange={e => setIsItItem(e.target.checked)}
            style={{ marginLeft: 10 }}
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>Search Items:</label>
          <input
            type="text"
            placeholder="Search by item name, category, or type..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: 8, 
              borderRadius: 4, 
              border: '1px solid #ccc',
              marginBottom: 8
            }}
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
            Select Items ({filteredInventory.length} available):
          </label>
          {filteredInventory.length === 0 ? (
            <div style={{ 
              padding: 16, 
              textAlign: 'center', 
              color: '#666', 
              backgroundColor: '#f8f9fa', 
              borderRadius: 8 
            }}>
              {searchTerm ? 'No items match your search.' : 'No items available.'}
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 10,
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              padding: 8
            }}>
              {filteredInventory.map(item => {
                const checked = selectedItems.some(i => i.id === item.id);
                const quantity = selectedItems.find(i => i.id === item.id)?.quantity || 1;
                return (
                  <div key={item.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 16, 
                    background: checked ? '#e3f2fd' : '#f8f9fa', 
                    borderRadius: 8, 
                    padding: '12px 16px',
                    border: checked ? '2px solid #1976d2' : '1px solid #e0e0e0',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleCheckboxChange(item.id)}
                      style={{ 
                        width: 18, 
                        height: 18, 
                        accentColor: '#1976d2', 
                        marginRight: 8 
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: '#333' }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {item.category} • {item.type} • Stock: {item.quantity}
                      </div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={quantity}
                      disabled={!checked}
                      onChange={e => handleQuantityChange(item.id, e.target.value)}
                      style={{ 
                        width: 70, 
                        marginLeft: 16, 
                        padding: 6, 
                        borderRadius: 4, 
                        border: '1px solid #ccc',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ color: '#888', fontSize: 13, minWidth: 30 }}>Qty</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading || selectedItems.length === 0 || !departmentId}
          style={{ 
            opacity: (isLoading || selectedItems.length === 0 || !departmentId) ? 0.6 : 1,
            cursor: (isLoading || selectedItems.length === 0 || !departmentId) ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Submitting...' : 'Submit Requisition'}
        </button>
      </form>
    </div>
  );
};

RequisitionForm.propTypes = {
  inventory: PropTypes.array.isRequired,
  setNotification: PropTypes.func,
};

export default RequisitionForm;
