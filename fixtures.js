exports.systems = [
  {
    id: 1,
    type: 'A',
  },
  {
    id: 2,
    type: 'B',
  },
];

exports.projects = [
  {id: 1, vessel: 'NCC-1701-D Enterprise', systemId: 1},
  {id: 2, vessel: 'SCV-70 White Base', systemId: 2},
];

exports.people = [
  {
    id: 1,
    name: 'Jean-Luc Picard',
    email: 'picard@example.com',
    company: 'Starfleet',
    projectId: 1,
  },
  {
    id: 2,
    name: 'Deanna Troi',
    email: 'troi@example.com',
    company: 'Starfleet',
    projectId: 1,
  },
  {
    id: 3,
    name: 'Geordi la Forge',
    email: 'geordi@example.com',
    company: 'Starfleet',
    projectId: 1,
  },
  {
    id: 4,
    name: 'Amuro Ray',
    email: 'amuro@example.com',
    company: 'EFSF',
    projectId: 2,
  },
  {
    id: 5,
    name: 'Char Aznable',
    company: 'Principality of Zeon',
    email: 'redcomet@example.com',
    projectId: 2,
  },
];
