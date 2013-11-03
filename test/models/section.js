exports.name = "Section";

function factory(kabam) {
  var GroupFactory = kabam.groups.GroupFactory;

  var Section = GroupFactory("Section", {
    roles: ["instructor", "assistant", "student"],
    fields: ["start_date", "end_date"],
    parent: "Course",
    permissions: {
      "addMember": ["manager"],
      "create": ["instructor"],
      "edit": ["instructor", "assistant"],
      "participate": ["instructor", "assistant", "student"],
      "view": ["instructor", "assistant", "student", "guest"],
      "delete": []
    }
  });

  Section.prototype.onAddMember = function(member) {
    var course_id = this.data.parent_id;

    // By default section members will be members
    // of the parent course
    member.access = {
      "instructor": "edit",
      "assistant": "edit",
      "student": "view"
    }[member.access];

    // Section
    Course.findById(course_id, function(err, course) {
      course.addMember(member, noop);
    });
  };

  return Section;
};

exports.model = {
  Section: factory
};
