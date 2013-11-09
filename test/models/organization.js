exports.name = 'Organization';

function factory(kernel) {
  var GroupFactory = kernel.groups.GroupFactory;

  var Organization = GroupFactory('Organization', {
    roles: ['admin', 'manager', 'member', 'guest'],
    children: ['Course'],
    permissions: {
      addMember: ['manager'],
      create: ['manager'],
      edit: ['manager'],
      participate: ['manager'],
      view: ['manager', 'member', 'guest'],
      delete: []
    }
  });

  return Organization;
}

exports.model = {
  Organization: factory
};
