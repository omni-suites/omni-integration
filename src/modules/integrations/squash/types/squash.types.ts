export interface SquashRequirementVersionPayload {
  _type: 'requirement-version';
  name: string;
  description?: string;
  reference?: string;
  status?: string;
}

export interface SquashRequirementPayload {
  _type: 'requirement';
  current_version: SquashRequirementVersionPayload;
  parent: {
    _type: 'project';
    id: number;
  };
}

export interface SquashRequirementUpdatePayload {
  _type: 'requirement';
  current_version: SquashRequirementVersionPayload;
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
