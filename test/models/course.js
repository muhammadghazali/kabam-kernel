exports.name = "Course";

function factory(kabam) {
  var GroupFactory = kabam.groups.GroupFactory;

  var Course = GroupFactory("Course", {
    roles: ["admin", "manager", "member", "guest"],
    parent: "Organization",
    permissions: {
      "addMember": ["manager"],
      "create": ["manager"],
      "edit": ["manager"],
      "participate": ["manager"],
      "view": ["manager", "member", "guest"],
      "delete": []
    }
  });

  return Course;
};

exports.model = {
  Course: factory
};
