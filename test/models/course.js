exports.name = 'Course';

function factory(kernel) {
  var GroupFactory = kernel.groups.GroupFactory;

  var Course = GroupFactory('Course', {
    roles: ['admin', 'manager', 'member', 'guest'],
    parent: 'Organization',
    permissions: {
      addMember: ['manager'],
      create: ['manager'],
      edit: ['manager'],
      participate: ['manager'],
      view: ['manager', 'member', 'guest'],
      delete: []
    }
  });

  Course.multiply = function(x) {
    return 2 * x;
  };

  Course.prototype.lowerName = function() {
    return this.name.toLowerCase();
  };

  return Course;
};

exports.model = {
  Course: factory
};
