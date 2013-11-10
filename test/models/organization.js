exports.name = 'Organization';

function factory(kernel) {
  var groupFactory = kernel.groups.groupFactory;

  var Organization = groupFactory('Organization', {
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
