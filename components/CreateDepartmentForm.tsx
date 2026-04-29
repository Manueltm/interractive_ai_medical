// app/components/CreateDepartmentForm.tsx
'use client';
import { useState } from 'react';
import { toast } from 'sonner';

export default function CreateDepartmentForm() {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    color: '#0077b6',
    fontColor: '#ffffff',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.ok) {
        toast.success(result.message); // e.g., "Department created successfully"
      } else {
        toast.error(result.error || 'Failed to create department');
      }
    } catch (error) {
      toast.error('An error occurred while creating the department');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Department Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className="border p-2 rounded w-full"
      />
      <input
        type="text"
        placeholder="Slug"
        value={formData.slug}
        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
        className="border p-2 rounded w-full"
      />
      <input
        type="color"
        value={formData.color}
        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
        className="border p-2 rounded"
      />
      <input
        type="color"
        value={formData.fontColor}
        onChange={(e) => setFormData({ ...formData, fontColor: e.target.value })}
        className="border p-2 rounded"
      />
      <button type="submit" className="bg-blue-500 text-white p-2 rounded">
        Create Department
      </button>
    </form>
  );
}