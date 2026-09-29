export interface SquashRequirementPayload {
  _type: 'requirement';
  name: string;
  description?: string;
  reference?: string;
  status?: string;
  parent?: {
    _type: 'project';
    id: number;
  };
}

export interface SquashRequirement {
  id: number;
  name?: string;
  description?: string;
  reference?: string;
  status?: string;
}

export interface SquashProject {
  id: number;
  name: string;
}
